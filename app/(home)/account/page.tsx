"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCurrentUser,
  useGoogleAuth,
  useDropboxAuth,
} from "@/hooks/use-auth";
import { useDropboxStatus } from "@/hooks/use-dropbox-status";
import { getUserInitials } from "@/lib/user-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Save, Loader, Link, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

function AccountContent() {
  const { user, isLoading } = useCurrentUser();
  const { initiateGoogleAuth } = useGoogleAuth();
  const { initiateDropboxAuth } = useDropboxAuth();
  const { data: dropboxStatus, refetch: refetchDropboxStatus } =
    useDropboxStatus();

  // Google Drive status check
  const { data: googleStatus, refetch: refetchGoogleStatus } = useQuery({
    queryKey: ["google-drive-status"],
    queryFn: async () => {
      const response = await fetch("/api/auth/google-drive-token");
      if (response.ok) {
        const data = await response.json();
        return { hasAccess: true, accessToken: data.accessToken };
      }
      return { hasAccess: false };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      toast.success("Profile updated successfully!");

      // Update the user context with new data
      if (data.user) {
        setName(data.user.name);
        setPhone(data.user.phone || "");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file before upload
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file (JPEG, PNG, GIF, etc.)");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to upload avatar";
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
          toast.success("Avatar updated successfully!");
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error: any) {
        console.error("Avatar upload error:", error);
        toast.error(
          error.message || "Failed to upload avatar. Please try again."
        );
      } finally {
        setIsUploadingAvatar(false);
        // Reset file input to allow uploading the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setAvatarUrl(user?.avatarUrl || "");
  };

  const handleConnectDropbox = () => {
    initiateDropboxAuth();
  };

  const handleDisconnectDropbox = async () => {
    try {
      const response = await fetch("/api/auth/dropbox/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Dropbox disconnected successfully!");
        refetchDropboxStatus();
      } else {
        throw new Error("Failed to disconnect Dropbox");
      }
    } catch (error) {
      console.error("Dropbox disconnect error:", error);
      toast.error("Failed to disconnect Dropbox. Please try again.");
    }
  };

  const handleConnectGoogle = () => {
    initiateGoogleAuth();
  };

  const handleDisconnectGoogle = async () => {
    try {
      const response = await fetch("/api/auth/google/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Google Drive disconnected successfully!");
        refetchGoogleStatus();
      } else {
        throw new Error("Failed to disconnect Google Drive");
      }
    } catch (error) {
      console.error("Google disconnect error:", error);
      toast.error("Failed to disconnect Google Drive. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please log in to view your account settings.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Account Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your account details and personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={user.name} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader className="h-4 w-4 animate-spin [animation-duration:1000ms]" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-lg font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  placeholder="Enter your email address"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update
                  your email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {" "}
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Reset
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin [animation-duration:1000ms]" />
                    Saving...
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Connect your cloud storage accounts to save and share your
              recordings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropbox Integration */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Image
                  src="/assets/dropbox-logo.svg"
                  alt="Dropbox"
                  width={32}
                  height={32}
                />
                <div>
                  <h3 className="font-medium">Dropbox</h3>
                  {dropboxStatus?.hasAccess && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <span className="text-sm font-medium">• Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {dropboxStatus?.hasAccess ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectDropbox}
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectDropbox}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {/* Google Drive Integration */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Image
                  src="/assets/google-logo.svg"
                  alt="Google Drive"
                  width={32}
                  height={32}
                />
                <div>
                  <h3 className="font-medium">Google Drive</h3>
                  {googleStatus?.hasAccess && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <span className="text-sm font-medium">• Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {googleStatus?.hasAccess ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectGoogle}
                    >
                      <Unlink className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGoogle}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
