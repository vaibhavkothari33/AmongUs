// import { useAuth } from '../context/AuthContext';
// import { useNavigate } from 'react-router-dom';

// function Login() {
//   const { login, user } = useAuth();
//   const navigate = useNavigate();

//   const handleLogin = () => {
//     login();
//   };

//   if (user) {
//     // Redirect based on user role (you'll need to implement role checking)
//     navigate('/player');
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900">
//       <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
//         <h1 className="text-4xl font-bold text-white mb-8">Among Us IRL</h1>
//         <button
//           onClick={handleLogin}
//           className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
//         >
//           Login with Google
//         </button>
//       </div>
//     </div>
//   );
// }

// export default Login;
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { login, user, loginError, loading } = useAuth();
  const navigate = useNavigate();

  // Check if already logged in and redirect
  useEffect(() => {
    if (user) {
      // Redirect is handled by the AuthProvider
      console.log("User already logged in");
    }
  }, [user, navigate]);

  const handleLogin = () => {
    console.log("Login button clicked");
    login();
  };

  // If still loading, show a loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If user is already logged in, don't render the login page
  if (user) {
    return null; // Return nothing, redirect is handled by useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <img 
          src="/fullarvr.jpeg" 
          alt="Among Us IRL Logo" 
          className="h-32 mx-auto mb-6" 
        />
        <h1 className="text-4xl font-bold text-white mb-6">Among Us IRL</h1>
        
        {loginError && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            Login error: {loginError}
          </div>
        )}
        
        <p className="text-gray-300 mb-6">Login with your Google account to join the game.</p>
        
        <button
          onClick={handleLogin}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 w-full flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
          </svg>
          Login with Google
        </button>
        
        <p className="text-gray-400 mt-6 text-sm">
          By logging in, you agree to the game's rules and conditions.
        </p>
      </div>
    </div>
  );
}

export default Login;