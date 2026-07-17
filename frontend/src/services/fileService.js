import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getFiles = async (groupId) => {
  const { data } = await api.get(`/files/${groupId}`, {
    headers: getAuthHeaders(),
  });
  return data.data;
};

export const uploadFile = async ({ groupId, file }) => {
  const formData = new FormData();
  formData.append("groupId", groupId);
  formData.append("file", file);

  const { data } = await api.post("/files/upload", formData, {
    headers: getAuthHeaders(),
  });

  return data.data;
};

export const deleteFile = async (fileId) => {
  const { data } = await api.delete(`/files/${fileId}`, {
    headers: getAuthHeaders(),
  });
  return data.data;
};

export const resolveFileUrl = (fileUrl) => {
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
  const baseUrl = apiUrl.replace(/\/api\/?$/, "");
  return `${baseUrl}${fileUrl}`;
};
