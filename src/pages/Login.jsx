import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
  };

  if (user) {
    // Redirect based on user role (you'll need to implement role checking)
    navigate('/player');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Among Us IRL</h1>
        <button
          onClick={handleLogin}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}

export default Login;