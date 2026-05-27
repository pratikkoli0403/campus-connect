import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

export const getGroups = async () => {
  const { data } = await api.get("/groups/my-groups", {
    headers: getAuthHeaders(),
  });
  return data;
};

export const joinGroup = async (groupId) => {
  const { data } = await api.post(
    "/groups/join",
    { groupId },
    { headers: getAuthHeaders() }
  );
  return data;
};

export const getGroupMembers = async (groupId) => {
  const { data } = await api.get(`/groups/${groupId}/members`, {
    headers: getAuthHeaders(),
  });
  return data;
};
