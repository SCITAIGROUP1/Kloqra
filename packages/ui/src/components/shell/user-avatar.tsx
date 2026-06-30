"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.js";
import { userAvatarVariants } from "./shell-styles.js";
import { getDisplayInitials } from "./shell-utils.js";

type UserAvatarSize = NonNullable<Parameters<typeof userAvatarVariants>[0]>["size"];

export type UserAvatarProps = {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  href?: string;
  size?: UserAvatarSize;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "className">;

export function UserAvatar({
  name,
  firstName,
  lastName,
  href,
  size = "sm",
  className,
  ...props
}: UserAvatarProps) {
  const initials = getDisplayInitials(firstName, lastName, name);
  const classes = cn(userAvatarVariants({ size }), className);

  if (href) {
    return (
      <Link href={href} className={classes} title={name} aria-label={name} {...props}>
        {initials}
      </Link>
    );
  }

  return (
    <span className={classes} title={name} aria-hidden>
      {initials}
    </span>
  );
}
