import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DoctorProfilePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/doctor', { state: { openSettings: true }, replace: true });
  }, [navigate]);
  return null;
}
