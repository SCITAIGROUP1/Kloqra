import { ProfilePage } from "@kloqra/web-shared";

export const metadata = {
  title: "Profile"
};

export default function Page() {
  return <ProfilePage settingsHref="/account/settings?section=security" />;
}
