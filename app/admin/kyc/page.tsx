"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileCheck, CheckCircle, XCircle, Clock, X } from "lucide-react";

export default function AdminKycPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kyc");
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to load");
      const subs = j.submissions || [];
      setSubmissions(subs);
      
      // Fetch user info for each submission
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json();
      if (usersRes.ok && usersData.users) {
        const map: Record<string, any> = {};
        usersData.users.forEach((u: any) => {
          map[u.id] = u;
        });
        setUserMap(map);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load KYC submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason: reason[id] || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed");
      toast.success(action === "approve" ? "KYC approved" : "KYC rejected");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    }
  }

  const getUserInfo = (userId: string) => {
    const user = userMap[userId];
    if (!user) return { name: "Unknown User", email: "N/A" };
    const name = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || "No name";
    const email = user.emailAddresses?.[0]?.emailAddress || "No email";
    return { name, email };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <FileCheck className="w-7 h-7" />
          KYC Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and approve KYC submissions from users
        </p>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading KYC submissions...</div>
      ) : submissions.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s) => {
            const { name, email } = getUserInfo(s.user_id);
            return (
              <Card key={s.id} className="p-5 space-y-4 border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {s.user_id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(s.status)}
                    <span className={`text-xs uppercase px-2 py-1 rounded-full border font-medium ${
                      s.status === "verified"
                        ? "text-green-600 bg-green-50 border-green-300"
                        : s.status === "rejected"
                        ? "text-red-600 bg-red-50 border-red-300"
                        : "text-yellow-600 bg-yellow-50 border-yellow-300"
                    }`}>
                      {s.status || "pending"}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground border-t pt-3">
                  Submitted: {new Date(s.created_at).toLocaleString()}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documents:</p>
                  <div className="flex flex-wrap gap-2">
                    {s.documents?.id_front && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setViewingDocument({
                          url: `/api/admin/kyc/document?path=${encodeURIComponent(s.documents.id_front)}`,
                          title: "ID Front"
                        })}
                      >
                        View ID Front
                      </Button>
                    )}
                    {s.documents?.id_back && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setViewingDocument({
                          url: `/api/admin/kyc/document?path=${encodeURIComponent(s.documents.id_back)}`,
                          title: "ID Back"
                        })}
                      >
                        View ID Back
                      </Button>
                    )}
                    {s.documents?.selfie && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setViewingDocument({
                          url: `/api/admin/kyc/document?path=${encodeURIComponent(s.documents.selfie)}`,
                          title: "Selfie"
                        })}
                      >
                        View Selfie
                      </Button>
                    )}
                    {s.documents?.address_proof && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setViewingDocument({
                          url: `/api/admin/kyc/document?path=${encodeURIComponent(s.documents.address_proof)}`,
                          title: "Address Proof"
                        })}
                      >
                        View Address Proof
                      </Button>
                    )}
                    {!s.documents?.id_front && !s.documents?.id_back && !s.documents?.selfie && !s.documents?.address_proof && (
                      <span className="text-xs text-muted-foreground">No documents uploaded</span>
                    )}
                  </div>
                </div>
                
                {s.status === "pending" && (
                  <div className="space-y-2 border-t pt-3">
                    <textarea
                      placeholder="Rejection reason (optional)"
                      className="w-full border rounded p-2 text-sm bg-background resize-none"
                      rows={2}
                      value={reason[s.id] || ""}
                      onChange={(e) => setReason((r) => ({ ...r, [s.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
                        onClick={() => act(s.id, "approve")}
                        disabled={loading}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => act(s.id, "reject")}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                
                {s.reason && s.status === "rejected" && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    <strong>Reason:</strong> {s.reason}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No KYC submissions yet</p>
        </Card>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingDocument(null)}
        >
          <div 
            className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background">
              <h3 className="font-semibold text-lg">{viewingDocument.title}</h3>
              <Button 
                onClick={() => setViewingDocument(null)} 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              {viewingDocument.url.endsWith(".pdf") || viewingDocument.url.includes(".pdf") ? (
                <iframe 
                  src={viewingDocument.url} 
                  className="w-full h-[70vh] border rounded"
                  title={viewingDocument.title}
                />
              ) : (
                <img 
                  src={viewingDocument.url} 
                  alt={viewingDocument.title} 
                  className="max-w-full max-h-[80vh] object-contain rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


