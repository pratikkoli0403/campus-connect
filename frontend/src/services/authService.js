import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const { data } = await api.patch(
    "/auth/change-password",
    {
      currentPassword,
      newPassword,
    },
    {
      headers: getAuthHeaders(),
    }
  );

  return data;
};
