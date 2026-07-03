"use client";

import { ROUTES, type UserProfileDto } from "@kloqra/contracts";
import { AppModal, Button, CountryPhoneInput, Input, Label } from "@kloqra/ui";
import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../api/client.js";
import { getWorkspaceId } from "../../../stores/session.store.js";
import { useUserProfileStore } from "../../../stores/user-profile.store.js";

export function PersonalInfoSection({
  profile,
  onSave
}: {
  profile: UserProfileDto;
  onSave: (data: {
    firstName: string;
    lastName: string;
    phone: string | null;
    location: string | null;
  }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [saving, setSaving] = useState(false);

  // OTP Verification state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setLocation(profile.location ?? "");
  }, [profile]);

  const isPhoneVerified =
    profile.phone && phone === profile.phone && Boolean(profile.phoneVerifiedAt);

  const isValidE164 = /^\+[1-9]\d{1,14}$/.test(phone);

  const isDirty =
    firstName !== profile.firstName ||
    lastName !== profile.lastName ||
    (phone || null) !== profile.phone ||
    (location || null) !== profile.location;

  async function handleSave() {
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null
      });
      toast.success("Personal information saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendOtp() {
    setSendingOtp(true);
    setOtpError("");
    const wsId = getWorkspaceId() || "";
    try {
      await api(ROUTES.USERS.PHONE_SEND_OTP, {
        method: "POST",
        workspaceId: wsId,
        body: JSON.stringify({ phone })
      });
      setOtpCode("");
      setOtpOpen(true);
      toast.success("Verification code sent successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send verification code");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setVerifying(true);
    setOtpError("");
    const wsId = getWorkspaceId() || "";
    try {
      const updatedProfile = await api<UserProfileDto>(ROUTES.USERS.PHONE_VERIFY_OTP, {
        method: "POST",
        workspaceId: wsId,
        body: JSON.stringify({ code: otpCode })
      });

      if (wsId) {
        useUserProfileStore.getState().setProfile(wsId, updatedProfile);
      }

      setOtpOpen(false);
      toast.success("Phone number verified successfully");
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-base font-semibold">Personal Information</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">First Name</Label>
          <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last Name</Label>
          <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" value={profile.email} disabled className="bg-muted/30" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="phone">Phone Number</Label>
            {phone && (
              <div className="flex items-center gap-1.5 text-xs">
                {isPhoneVerified ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium dark:text-emerald-500">
                    <ShieldCheck className="size-4" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-medium dark:text-amber-500">
                    <ShieldAlert className="size-4" /> Unverified
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 max-w-md">
            <CountryPhoneInput
              value={phone}
              onChange={setPhone}
              disabled={saving || verifying}
              className="flex-1"
            />
            {phone && !isPhoneVerified && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSendOtp()}
                disabled={sendingOtp || verifying || !isValidE164}
                className="h-9 px-3 shrink-0 text-sm font-medium"
              >
                {sendingOtp ? "Sending…" : "Verify"}
              </Button>
            )}
          </div>
          {phone && !isPhoneVerified && !isValidE164 && (
            <p className="text-xs text-destructive mt-1 max-w-md">
              Please enter a valid phone number (e.g., +12025550143)
            </p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !isDirty || (phone !== profile.phone && !isPhoneVerified)}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <AppModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        title="Verify phone number"
        description="Enter the 6-digit verification code sent to your phone."
        icon={<KeyRound className="size-5" />}
        showClose={false}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOtpOpen(false)}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={verifying || otpCode.length !== 6}
              className="min-w-[140px]"
            >
              {verifying ? "Verifying…" : "Submit Code"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="otp-code">Verification Code</Label>
            <Input
              id="otp-code"
              type="text"
              pattern="\d*"
              maxLength={6}
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setOtpCode(val);
                setOtpError("");
              }}
              placeholder="e.g. 123456"
              autoFocus
              className="text-center text-lg tracking-widest font-mono"
            />
            {otpError && <p className="text-sm font-medium text-destructive">{otpError}</p>}
          </div>
        </div>
      </AppModal>
    </div>
  );
}
