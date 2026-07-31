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
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
  const baseUrl = apiUrl.replace(/\/api\/?$/, "");
  if (!fileUrl) return "#";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return `${baseUrl}${fileUrl}`;
};

export const downloadFile = async (file) => {
  if (!file?.fileUrl) {
    throw new Error("This file is no longer available.");
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
  const backendUrl = apiUrl.replace(/\/api\/?$/, "");
  const response = await api.get(file.fileUrl, {
    baseURL: backendUrl,
    headers: getAuthHeaders(),
    responseType: "blob",
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    let message = "Failed to download file.";
    try {
      const payload = JSON.parse(await response.data.text());
      message = payload.message ?? message;
    } catch {
      // Keep the safe generic error when the response is not JSON.
    }
    throw new Error(message);
  }

  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = file.fileName || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};
