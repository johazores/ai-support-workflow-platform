import { apiClient } from "@/lib/api-client";

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function fetchOrganizationInvitations() {
  const result = await apiClient<{ data: OrganizationInvitation[] }>(
    "/api/organization-invitations",
  );
  return result.data;
}

export async function inviteOrganizationMember(input: {
  email: string;
  role: string;
}) {
  const result = await apiClient<{
    data: {
      invitation: OrganizationInvitation;
      delivery: "email" | "member-added";
    };
  }>("/api/organization-invitations", {
    method: "POST",
    body: input,
  });

  return result.data;
}

export async function revokeOrganizationInvitation(id: string) {
  const result = await apiClient<{ data: OrganizationInvitation }>(
    `/api/organization-invitations/${id}`,
    { method: "DELETE" },
  );
  return result.data;
}
