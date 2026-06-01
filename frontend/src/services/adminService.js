import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const importStudents = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/import-students", formData, {
    headers: getAuthHeaders(),
  });

  return data.data;
};
