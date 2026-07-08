import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../api/client';

export default function Profile() {
  const { user, logout } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      await api.updateProfile({ bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px' }}>Your Profile</h1>

      <div className="card-flat" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'var(--gradient-purple)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: 'white'
          }}>{user?.username?.[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{user?.username}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="label">Bio</label>
          <textarea className="input-field" value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..." rows={4} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✅ Saved!' : '💾 Save Profile'}
          </button>
        </div>
      </div>

      <div className="card-flat" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--accent-red)' }}>
          Danger Zone
        </h3>
        <button className="btn btn-danger btn-sm" onClick={logout}>🚪 Sign Out</button>
      </div>
    </div>
  );
}
