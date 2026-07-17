import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const getMessages = async (groupId) => {
  const response = await api.get(`/messages/${groupId}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};

export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/messages/${messageId}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
};