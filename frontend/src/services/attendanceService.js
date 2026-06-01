import api from "./api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getMyAttendance = async () => {
  const { data } = await api.get("/attendance/me", {
    headers: getAuthHeaders(),
  });
  return data.data;
};

export const updateAttendance = async (userId, attendancePercentage) => {
  const { data } = await api.patch(
    `/attendance/${userId}`,
    { attendancePercentage },
    { headers: getAuthHeaders() }
  );
  return data.data;
};
