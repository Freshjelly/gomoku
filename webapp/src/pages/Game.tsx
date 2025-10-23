import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // This page is for direct game access (should redirect to join)
  useEffect(() => {
    if (roomId) {
      navigate(`/join/${roomId}`);
    } else {
      navigate('/');
    }
  }, [roomId, navigate]);

  return null;
}
