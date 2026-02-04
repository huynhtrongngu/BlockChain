import React, { useEffect, useMemo, useState } from "react";
import { getProfile, upsertProfile } from "../services/profileService";

const Profile = ({ account }) => {
  const [form, setForm] = useState({
    ho_ten: "",
    email: "",
    so_dien_thoai: "",
    dia_chi_lien_he: "",
    avatar_url: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const shortAccount = useMemo(() => {
    if (!account) return "";
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }, [account]);

  useEffect(() => {
    const run = async () => {
      if (!account) return;

      setIsLoading(true);
      setStatus({ type: "", message: "" });

      try {
        const data = await getProfile(account);
        setForm({
          ho_ten: data.ho_ten || "",
          email: data.email || "",
          so_dien_thoai: data.so_dien_thoai || "",
          dia_chi_lien_he: data.dia_chi_lien_he || "",
          avatar_url: data.avatar_url || "",
        });
      } catch (err) {
        // Nếu chưa có profile thì cho phép tạo mới
        const message = err?.response?.data?.message || err.message;
        if (err?.response?.status === 404) {
          setStatus({
            type: "loading",
            message: "Chưa có hồ sơ. Bạn có thể tạo mới bên dưới.",
          });
          setForm({
            ho_ten: "",
            email: "",
            so_dien_thoai: "",
            dia_chi_lien_he: "",
            avatar_url: "",
          });
        } else {
          setStatus({ type: "error", message });
        }
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [account]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      setStatus({ type: "error", message: "Vui lòng kết nối ví trước." });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      // Gửi "" để backend unset field (cho phép xóa email/sđt...)
      const payload = {
        ho_ten: form.ho_ten,
        email: form.email,
        so_dien_thoai: form.so_dien_thoai,
        dia_chi_lien_he: form.dia_chi_lien_he,
        avatar_url: form.avatar_url,
      };

      const saved = await upsertProfile(account, payload);
      setForm({
        ho_ten: saved.ho_ten || "",
        email: saved.email || "",
        so_dien_thoai: saved.so_dien_thoai || "",
        dia_chi_lien_he: saved.dia_chi_lien_he || "",
        avatar_url: saved.avatar_url || "",
      });
      setStatus({ type: "success", message: "Đã lưu hồ sơ thành công." });
    } catch (err) {
      const message = err?.response?.data?.message || err.message;
      setStatus({ type: "error", message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!account) {
    return (
      <div className="card">
        <h2>Hồ sơ cá nhân</h2>
        <div className="status-box loading">
          Vui lòng kết nối ví để xem/cập nhật hồ sơ.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Hồ sơ cá nhân</h2>

      <div className="profile-wallet">
        <div className="profile-wallet-label">Ví đang dùng</div>
        <div className="profile-wallet-value">{shortAccount}</div>
      </div>

      {isLoading ? (
        <div className="status-box loading">Đang tải hồ sơ...</div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input
              className="form-input"
              name="ho_ten"
              value={form.ho_ten}
              onChange={onChange}
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="abc@example.com"
            />
            <div className="form-hint">
              Để trống để xoá email (nếu đã lưu trước đó).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-input"
              name="so_dien_thoai"
              value={form.so_dien_thoai}
              onChange={onChange}
              placeholder="+84 9xx xxx xxx"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Địa chỉ liên hệ</label>
            <input
              className="form-input"
              name="dia_chi_lien_he"
              value={form.dia_chi_lien_he}
              onChange={onChange}
              placeholder="Hà Nội, Việt Nam"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar URL</label>
            <input
              className="form-input"
              name="avatar_url"
              value={form.avatar_url}
              onChange={onChange}
              placeholder="https://..."
            />
          </div>

          <button className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>

          {status.message ? (
            <div className={`status-box ${status.type}`}>{status.message}</div>
          ) : null}
        </form>
      )}
    </div>
  );
};

export default Profile;
