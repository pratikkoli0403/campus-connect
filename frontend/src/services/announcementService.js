import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

export const getAnnouncements = async (groupId) => {
  const { data } = await api.get(`/announcements/${groupId}`, {
    headers: getAuthHeaders(),
  });
  return data.data;
};

export const createAnnouncement = async ({ groupId, title, content }) => {
  const { data } = await api.post(
    "/announcements",
    { groupId, title, content },
    { headers: getAuthHeaders() }
  );
  return data.data;
};
