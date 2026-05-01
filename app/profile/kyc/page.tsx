"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import Link from "next/link";
import {
  Upload,
  FileText,
  User,
  Briefcase,
  CreditCard,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

export default function KYCPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      if (!user?.id) return;
      try {
        const res = await fetch("/api/kyc/check");
        if (res.ok) {
          const data = await res.json();
          setKycStatus(data.kycStatus);
          setRejectionReason(data.rejectionReason);
        }
      } catch (e) {
        console.error("Error checking KYC status:", e);
      } finally {
        setFetchingStatus(false);
      }
    }
    checkStatus();
  }, [user?.id]);

  // Personal Information
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    ssn: "",
    dateOfBirth: "",
    phoneNumber: "",
    country: "",
    city: "",
    postalCode: "",
    employmentStatus: "",
    employerName: "",
    employmentAddress: "",
    monthlyIncome: "",
    annualIncome: "",
    bankName: "",
    bankAccountNumber: "",
    bankRoutingNumber: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  async function uploadFile(keyHint: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("userId", user!.id);
    body.append("keyHint", keyHint);
    const res = await fetch("/api/kyc/upload", { method: "POST", body });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Upload failed");
    }
    const j = await res.json();
    return j.publicUrl as string;
  }

  async function submit() {
    if (!user?.id) {
      toast.error("Please sign in to submit KYC");
      return;
    }

    // Validate required fields
    if (!idFront || !idBack || !selfie || !addressProof) {
      toast.error("Please upload all required documents");
      return;
    }

    // Personal fields are optional for submission; admin can request more info later

    setLoading(true);

    try {
      const base = `${user.id}/${Date.now()}`;
      const urls: any = {};

      // Upload files and get paths
      const idFrontResult = await uploadFile("id-front", idFront);
      const idBackResult = await uploadFile("id-back", idBack);
      const selfieResult = await uploadFile("selfie", selfie);
      const addressResult = await uploadFile("address", addressProof);
      
      // Store the paths (extract from URL if needed)
      urls.id_front = typeof idFrontResult === 'string' && idFrontResult.startsWith('http') 
        ? idFrontResult 
        : idFrontResult;
      urls.id_back = typeof idBackResult === 'string' && idBackResult.startsWith('http') 
        ? idBackResult 
        : idBackResult;
      urls.selfie = typeof selfieResult === 'string' && selfieResult.startsWith('http') 
        ? selfieResult 
        : selfieResult;
      urls.address_proof = typeof addressResult === 'string' && addressResult.startsWith('http') 
        ? addressResult 
        : addressResult;

      // Submit KYC via API route (uses service role to bypass RLS)
      const submitResponse = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: urls }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to submit KYC: ${submitResponse.statusText}`
        );
      }

      const submitData = await submitResponse.json();
      if (!submitData.success) {
        throw new Error("KYC submission was not successful. Please try again.");
      }

      toast.success("KYC submitted successfully! We'll review your documents soon.");

      // Reset form
      setIdFront(null);
      setIdBack(null);
      setSelfie(null);
      setAddressProof(null);
      setFormData({
        ssn: "",
        dateOfBirth: "",
        phoneNumber: "",
        country: "",
        city: "",
        postalCode: "",
        employmentStatus: "",
        employerName: "",
        employmentAddress: "",
        monthlyIncome: "",
        annualIncome: "",
        bankName: "",
        bankAccountNumber: "",
        bankRoutingNumber: "",
      });
    } catch (error: any) {
      console.error("Error submitting KYC:", error);
      toast.error(
        `Error submitting KYC: ${error.message || "Please try again"}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">KYC Verification</h1>
        <p className="text-muted-foreground mt-2">
          Complete your Know Your Customer verification to apply for funding
        </p>
      </div>

      {fetchingStatus ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FE01] mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking verification status...</p>
        </div>
      ) : kycStatus === "verified" ? (
        <Card className="p-8 text-center max-w-2xl mx-auto border-[#00FE01]/30 bg-[#00FE01]/5">
          <div className="w-20 h-20 bg-[#00FE01]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-[#00FE01]" />
          </div>
          <h2 className="text-2xl font-bold mb-2">You're Verified!</h2>
          <p className="text-muted-foreground mb-6">
            Your identity has been successfully verified. You now have full access to all platform features, including funding applications.
          </p>
          <Link href="/dashboard/funding">
            <Button className="bg-[#00FE01] hover:bg-[#00FE01]/90 text-black px-8">
              GO TO FUNDING
            </Button>
          </Link>
        </Card>
      ) : kycStatus === "pending" ? (
        <Card className="p-8 text-center max-w-2xl mx-auto border-yellow-500/30 bg-yellow-500/5">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Verification Under Review</h2>
          <p className="text-muted-foreground mb-4">
            We've received your documents and our team is currently reviewing them. This process typically takes 12-24 hours.
          </p>
          <p className="text-sm text-yellow-600 bg-yellow-100 rounded-lg p-3 inline-block">
            You'll receive an update once the review is complete.
          </p>
        </Card>
      ) : (
        <>
          {kycStatus === "rejected" && (
            <Card className="p-6 mb-8 border-red-500/50 bg-red-500/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600">Verification Rejected</h3>
                  <p className="text-muted-foreground mt-1">
                    Unfortunately, your recent verification attempt was unsuccessful for the following reason:
                  </p>
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm font-medium text-red-700">
                      {rejectionReason || "Please ensure all uploaded documents are clear and valid."}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Please review the feedback and submit your documents again below.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[#00FE01]" />
            <h2 className="text-xl font-semibold">Personal Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                SSN / Tax ID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="ssn"
                value={formData.ssn}
                onChange={handleInputChange}
                placeholder="XXX-XX-XXXX"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="United States"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="New York"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Postal Code
                </label>
                <Input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="10001"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Employment Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Employment Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Employment Status
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2 bg-background"
              >
                <option value="">Select status</option>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-Employed</option>
                <option value="unemployed">Unemployed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Employer Name
              </label>
              <Input
                type="text"
                name="employerName"
                value={formData.employerName}
                onChange={handleInputChange}
                placeholder="Company Name"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Employment Address
              </label>
              <Input
                type="text"
                name="employmentAddress"
                value={formData.employmentAddress}
                onChange={handleInputChange}
                placeholder="123 Business St, City, State"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Monthly Income ($)
                </label>
                <Input
                  type="number"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  placeholder="5000"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Annual Income ($)
                </label>
                <Input
                  type="number"
                  name="annualIncome"
                  value={formData.annualIncome}
                  onChange={handleInputChange}
                  placeholder="60000"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Banking Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-semibold">Banking Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Bank Name
              </label>
              <Input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="Bank Name"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Account Number
              </label>
              <Input
                type="text"
                name="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={handleInputChange}
                placeholder="Account Number"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Routing Number
              </label>
              <Input
                type="text"
                name="bankRoutingNumber"
                value={formData.bankRoutingNumber}
                onChange={handleInputChange}
                placeholder="Routing Number"
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Document Uploads */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold">Document Uploads</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                ID Front <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="id-front"
                />
                <label
                  htmlFor="id-front"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  {idFront ? idFront.name : "Click to upload ID Front"}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ID Back <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="id-back"
                />
                <label
                  htmlFor="id-back"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  {idBack ? idBack.name : "Click to upload ID Back"}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Selfie <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="selfie"
                />
                <label
                  htmlFor="selfie"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  {selfie ? selfie.name : "Click to upload Selfie"}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Proof of Address <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAddressProof(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="address"
                />
                <label
                  htmlFor="address"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  {addressProof
                    ? addressProof.name
                    : "Click to upload Address Proof"}
                </label>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <LoadingButton
          onClick={submit}
          loading={loading}
          className="bg-[#00FE01] hover:bg-[#00FE01]/90 text-black font-medium px-8"
        >
          <FileText className="w-4 h-4 mr-2" />
          Submit KYC Verification
        </LoadingButton>
      </div>
        </>
      )}
    </div>
  );
}
