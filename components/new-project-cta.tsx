"use client";

import { useState } from "react";
import Link from "next/link";
import EmailVerificationModal from "@/components/email-verification-modal";

/** "Nouveau projet" partout dans l'app — navigue normalement si le compte
 * est vérifié, sinon affiche un rappel plutôt que de laisser l'utilisateur
 * arriver sur le wizard pour se prendre un 403 à la création. */
export default function NewProjectCTA({
  emailVerified, href, className, children,
}: {
  emailVerified: boolean;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);

  if (!emailVerified) {
    return (
      <>
        <button type="button" onClick={() => setShowModal(true)} className={className}>
          {children}
        </button>
        {showModal && <EmailVerificationModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
