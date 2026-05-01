"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function UserFundingPage() {
  const { user } = useUser();
  const [offers, setOffers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showKycDialog, setShowKycDialog] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const { data: fundingData, error: fundingError } = await supabase
        .from("funding_options")
        .select(
          "id, title, description, amount, interest_rate, duration_days, image_url, status, created_at"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fundingError) {
        console.error("Error loading funding options:", fundingError);
        toast.error("Error loading funding options");
        setOffers([]);
      } else {
        // Filter out any null or invalid records
        const validOffers = (fundingData ?? []).filter(
          (offer) => offer && offer.id && offer.status === "active"
        );
        setOffers(validOffers);
        console.log("Loaded funding options:", validOffers.length);
      }

      if (user?.id) {
        // Load applications separately, then load funding options for each
        const { data: appData, error: appError } = await supabase
          .from("loan_applications")
          .select("id, user_id, loan_id, status, rejection_reason, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (appError) {
          console.error("Error loading applications:", appError);
          console.error(
            "App error details:",
            JSON.stringify(appError, null, 2)
          );
          setApps([]);
        } else {
          // For each application, load the funding option details
          const appsWithFunding = await Promise.all(
            (appData ?? []).map(async (app) => {
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
          setApps(appsWithFunding);
        }
      }
    } catch (error) {
      console.error("Error loading funding data:", error);
      toast.error("Error loading funding options");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  // Subscribe to profile changes to refresh KYC status in real-time
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase
      .channel("kyc-status-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // KYC status was updated, log it
          console.log("KYC status updated:", payload.new);
          // Note: The apply function will check fresh status each time
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function apply(funding_id: string) {
    if (!user?.id) {
      toast.error("Please sign in to apply for funding");
      return;
    }

    // Check KYC status using API route (bypasses RLS, gets latest status)
    try {
      const checkResponse = await fetch("/api/kyc/check");
      if (!checkResponse.ok) {
        console.error("Failed to check KYC status");
        setShowKycDialog(true);
        return;
      }

      const kycCheck = await checkResponse.json();
      
      if (!kycCheck.isVerified) {
        console.log("KYC status check:", kycCheck);
        setShowKycDialog(true);
        return;
      }
    } catch (error) {
      console.error("Error checking KYC status:", error);
      setShowKycDialog(true);
      return;
    }

    setActionLoading(funding_id);

    try {
      // First verify the funding option exists
      const { data: fundingOption, error: fundingError } = await supabase
        .from("funding_options")
        .select("id, title, status")
        .eq("id", funding_id)
        .maybeSingle();

      console.log("Funding option lookup:", {
        funding_id,
        fundingOption,
        fundingError,
      });

      if (fundingError) {
        console.error("Funding option lookup error:", fundingError);
        toast.error("Error verifying funding option. Please refresh the page.");
        return;
      }

      if (!fundingOption) {
        console.error("Funding option not found for ID:", funding_id);
        toast.error(
          "This funding option no longer exists. Please refresh the page to see available options."
        );
        // Reload the page to get updated funding options
        await load();
        return;
      }

      if (fundingOption.status !== "active") {
        toast.error("This funding option is no longer active.");
        await load();
        return;
      }

      // Check if user already has a pending application for this funding
      const { data: existingApp } = await supabase
        .from("loan_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("loan_id", funding_id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingApp) {
        toast.error(
          "You already have a pending application for this funding option"
        );
        return;
      }

      // Insert the application - simple and straightforward
      const { data, error } = await supabase
        .from("loan_applications")
        .insert({
          user_id: user.id,
          loan_id: fundingOption.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error applying for funding:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Funding ID used:", fundingOption.id);
        console.error("Funding option verified:", fundingOption);

        if (error.code === "23503" || error.message?.includes("foreign key")) {
          toast.error(
            "Database constraint error. The funding option may have been removed. Please refresh and try again."
          );
          await load(); // Reload to update the list
        } else if (error.code === "23505") {
          toast.error(
            "You already have an application for this funding option."
          );
        } else {
          toast.error(
            `Error submitting application: ${error.message || error.hint || "Please try again"}`
          );
        }
        return;
      }

      toast.success("Funding application submitted successfully!");
      await load();
    } catch (error: any) {
      console.error("Error applying for funding:", error);
      toast.error(
        `Error submitting application: ${error.message || "Please try again"}`
      );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-500";
      case "rejected":
        return "text-red-500";
      case "pending":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {showKycDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="p-6 w-full max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Verification Required</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need to complete the verification challenge to be eligible to apply for funding.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setShowKycDialog(false)}>Close</Button>
              <Link href="/profile/kyc">
                <Button className="bg-[#00FE01] hover:bg-[#00FE01]/90 text-black">GET VERIFIED</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Funding Options
        </h1>
        <p className="text-muted-foreground mt-2">
          Apply for funding to grow your trading capital
        </p>
      </div>

      {/* Available Funding Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-2 animate-spin" />
            <p>Loading funding options...</p>
          </div>
        ) : (
          offers.map((offer) => (
            <Card
              key={offer.id}
              className="p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="space-y-4">
                {offer.image_url && (
                  <div className="aspect-video bg-gradient-to-br from-[#00FE01]/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-semibold">{offer.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {offer.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Amount
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(offer.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Interest Rate
                    </span>
                    <span className="font-semibold">
                      {offer.interest_rate}% APR
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Duration
                    </span>
                    <span className="font-semibold">
                      {offer.duration_days} days
                    </span>
                  </div>
                </div>

                <LoadingButton
                  onClick={() => apply(offer.id)}
                  loading={actionLoading === offer.id}
                  className="w-full bg-[#00FE01] hover:bg-[#00FE01]/90 text-black font-medium"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Apply for Funding
                </LoadingButton>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* My Applications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5" />
          <h2 className="text-xl font-semibold">My Applications</h2>
        </div>
        <div className="space-y-3">
          {apps.length > 0 ? (
            apps.map((app) => (
              <div
                key={app.id}
                className={`p-4 border-2 rounded-lg ${
                  app.status === "rejected"
                    ? "border-red-500/50 bg-red-50/10"
                    : app.status === "approved"
                      ? "border-green-500/50 bg-green-50/10"
                      : "border-yellow-500/50 bg-yellow-50/10"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        app.status === "rejected"
                          ? "bg-red-500/20"
                          : app.status === "approved"
                            ? "bg-green-500/20"
                            : "bg-gradient-to-br from-[#00FE01]/20 to-blue-500/20"
                      }`}
                    >
                      <DollarSign
                        className={`w-6 h-6 ${
                          app.status === "rejected"
                            ? "text-red-500"
                            : app.status === "approved"
                              ? "text-green-500"
                              : "text-[#00FE01]"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {app.funding_options?.title || "Funding Option"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(app.funding_options?.amount || 0)} •
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      {app.rejection_reason && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm font-medium text-red-600 mb-1">
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-700">
                            {app.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span
                      className={`font-semibold capitalize px-3 py-1 rounded-full text-sm ${
                        app.status === "approved"
                          ? "bg-green-500/20 text-green-600"
                          : app.status === "rejected"
                            ? "bg-red-500/20 text-red-600"
                            : "bg-yellow-500/20 text-yellow-600"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No applications yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
