"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Upload, DollarSign, Users, Search } from "lucide-react";

export default function AdminFundingPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState("10");
  const [days, setDays] = useState("30");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const { data: offersData } = await supabase
        .from("funding_options")
        .select("*")
        .order("created_at", { ascending: false });
      setOffers(offersData ?? []);

      // Load pending applications separately to avoid join issues
      const { data: pendingData, error: pendingError } = await supabase
        .from("loan_applications")
        .select("id, user_id, loan_id, status, rejection_reason, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) {
        console.error("Error loading pending applications:", pendingError);
        setPending([]);
      } else {
        // Load funding option details for each application
        const pendingWithFunding = await Promise.all(
          (pendingData ?? []).map(async (app) => {
            if (app.loan_id) {
              const { data: fundingOption } = await supabase
                .from("funding_options")
                .select("title, amount")
                .eq("id", app.loan_id)
                .maybeSingle();

              return {
                ...app,
                funding_options: fundingOption || {
                  title: "Unknown Funding",
                  amount: 0,
                },
              };
            }
            return {
              ...app,
              funding_options: { title: "Unknown Funding", amount: 0 },
            };
          })
        );
        setPending(pendingWithFunding);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error loading funding data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadImage(file: File) {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("funding-images")
        .upload(fileName, file);

      if (error) {
        console.error("Storage upload error:", error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("funding-images").getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw new Error(
        `Image upload failed: ${error.message || "Unknown error"}`
      );
    }
  }

  async function createOffer() {
    if (!title || !amount || !rate || !days) {
      toast.error("Please fill in all required fields");
      return;
    }

    setActionLoading("create");

    try {
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (error: any) {
          console.error("Image upload error:", error);
          toast.error(`Image upload failed: ${error.message}`);
          setActionLoading(null);
          return;
        }
      }

      const { error } = await supabase.from("funding_options").insert({
        title,
        description,
        amount: parseFloat(amount),
        interest_rate: parseFloat(rate),
        duration_days: parseInt(days),
        image_url: imageUrl,
        status: "active",
      });

      if (error) {
        console.error("Error creating offer:", error);
        if (error.message.includes("row-level security")) {
          toast.error(
            "Permission denied. RLS policy is blocking this operation. Please check your database policies."
          );
        } else {
          toast.error(`Error creating funding option: ${error.message}`);
        }
        return;
      }

      setTitle("");
      setDescription("");
      setAmount("1000");
      setRate("10");
      setDays("30");
      setImageFile(null);

      toast.success("Funding option created successfully!");
      await load();
    } catch (error: any) {
      console.error("Error creating offer:", error);
      toast.error(
        `Error creating funding option: ${error.message || "Unknown error"}`
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function approveApplication(app: any) {
    setActionLoading(`approve-${app.id}`);
    try {
      await supabase
        .from("loan_applications")
        .update({ status: "approved" })
        .eq("id", app.id);

      const amount = Number(app.funding_options?.amount ?? 0);

      // Update user balance
      // Ensure user has a balance record first
      const { data: existingBalance } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", app.user_id)
        .maybeSingle();

      if (!existingBalance) {
        // Create initial balance record
        await supabase.from("user_balances").insert({
          user_id: app.user_id,
          account_balance: amount,
          profit_balance: 0,
          loss_balance: 0,
          funding_balance: amount,
        });
      } else {
        // Update existing balance
        await supabase
          .from("user_balances")
          .update({
            account_balance: existingBalance.account_balance + amount,
            funding_balance: existingBalance.funding_balance + amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", app.user_id);
      }

      // Add transaction record
      await supabase.from("transactions").insert({
        user_id: app.user_id,
        type: "funding_approval",
        amount,
        description: `Funding approved: ${app.funding_options?.title}`,
      });

      toast.success(
        `Successfully approved and funded $${amount} to user ${app.user_id}`
      );
      await load();
    } catch (error) {
      console.error("Error approving application:", error);
      toast.error("Error approving application. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(
    null
  );

  async function rejectApplication(app: any) {
    const reason = rejectionReasons[app.id];

    if (!reason || reason.trim() === "") {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionLoading(`reject-${app.id}`);
    try {
      await supabase
        .from("loan_applications")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", app.id);

      await supabase.from("transactions").insert({
        user_id: app.user_id,
        type: "funding_rejection",
        amount: 0,
        description: `Funding rejected: ${app.funding_options?.title}. Reason: ${reason}`,
      });

      toast.success(`Application rejected with reason sent to user`);
      setRejectionReasons({ ...rejectionReasons, [app.id]: "" });
      setShowRejectionModal(null);
      await load();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast.error("Error rejecting application. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Funding Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Create funding options and manage applications
        </p>
      </div>

      {/* Create New Funding Option */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Create Funding Option</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                placeholder="e.g., Gold Premium Funding"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 bg-background"
                rows={3}
                placeholder="Describe this funding option..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount *
                </label>
                <Input
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Rate % *
                </label>
                <Input
                  placeholder="10"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Days *</label>
                <Input
                  placeholder="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  {imageFile ? imageFile.name : "Click to upload image"}
                </label>
              </div>
            </div>
            <LoadingButton
              onClick={createOffer}
              loading={actionLoading === "create"}
              className="w-full bg-[#00FE01] hover:bg-[#00FE01]/90 text-black"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Create Funding Option
            </LoadingButton>
          </div>
        </div>
      </Card>

      {/* Pending Applications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Pending Applications</h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading applications...</p>
            </div>
          ) : pending.length > 0 ? (
            pending.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00FE01]/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-[#00FE01]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {app.funding_options?.title || "Funding Option"}
                    </p>
                    <p className="text-sm text-muted-foreground break-all">
                      User: {app.user_id.slice(0, 8)}... •{" "}
                      {formatCurrency(app.funding_options?.amount || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {showRejectionModal === app.id ? (
                    <div className="space-y-2 p-3 border rounded-lg bg-red-50/50">
                      <textarea
                        placeholder="Enter rejection reason (e.g., KYC not verified, insufficient income, etc.)"
                        value={rejectionReasons[app.id] || ""}
                        onChange={(e) =>
                          setRejectionReasons({
                            ...rejectionReasons,
                            [app.id]: e.target.value,
                          })
                        }
                        className="w-full border rounded px-3 py-2 bg-background text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          onClick={() => rejectApplication(app)}
                          loading={actionLoading === `reject-${app.id}`}
                          className="bg-red-500 hover:bg-red-600 text-white flex-1"
                        >
                          Confirm Rejection
                        </LoadingButton>
                        <Button
                          onClick={() => {
                            setShowRejectionModal(null);
                            setRejectionReasons({
                              ...rejectionReasons,
                              [app.id]: "",
                            });
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <LoadingButton
                        onClick={() => approveApplication(app)}
                        loading={actionLoading === `approve-${app.id}`}
                        className="bg-green-500 hover:bg-green-600 flex-1"
                      >
                        Approve & Fund
                      </LoadingButton>
                      <Button
                        onClick={() => setShowRejectionModal(app.id)}
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50 flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending applications</p>
            </div>
          )}
        </div>
      </Card>

      {/* Existing Funding Options */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Funding Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="border rounded-lg p-4">
              {offer.image_url && (
                <div className="aspect-video bg-gradient-to-br from-[#00FE01]/20 to-blue-500/20 rounded-lg mb-3">
                  <img
                    src={offer.image_url}
                    alt={offer.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              )}
              <h3 className="font-semibold">{offer.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {offer.description}
              </p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(offer.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span className="font-medium">{offer.interest_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">
                    {offer.duration_days} days
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
