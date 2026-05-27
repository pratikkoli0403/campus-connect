import api from "./api";

export const getMessages = async (groupId) => {
  const token = localStorage.getItem("token");

  const response = await api.get(
    `/messages/${groupId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data.data;
};