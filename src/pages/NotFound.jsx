import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-among-dark flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-among-red mb-4">404</h1>
        <div className="text-white text-2xl mb-8">
          <p className="mb-2">Looks like this crewmate was ejected...</p>
          <p>Page not found!</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-among-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
        >
          Return to Ship
        </button>
      </div>
    </div>
  );
}

export default NotFound;