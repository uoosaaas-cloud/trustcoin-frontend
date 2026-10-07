import { api, type ApiSuccessResponse } from "./api";

export async function disableMyAccount() {
  const { data } = await api.post<ApiSuccessResponse<{ status: "BLOCKED" }>>("/users/me/disable", {
    confirm: true,
  });
  return data;
}

export interface UserAnnouncement {
  id: string;
  title: string;
  body: string;
}

export async function getMyAnnouncement() {
  const { data } = await api.get<ApiSuccessResponse<UserAnnouncement | null>>("/users/me/announcement");
  return data;
}

export async function dismissMyAnnouncement(announcementId: string) {
  const { data } = await api.post<ApiSuccessResponse<{ dismissed: boolean }>>(
    "/users/me/announcement/dismiss",
    { announcementId }
  );
  return data;
}
