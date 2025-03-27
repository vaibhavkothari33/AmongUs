import { createContext, useState, useContext, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { useNavigate } from 'react-router-dom';
import { generatePlayerTasks } from '../utils/taskGenerator';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      let session;
      try {
        session = await account.getSession('current');
      } catch (error) {
        setLoading(false);
        setUser(null);
        setIsAdmin(false);
        navigate('/login');
        return;
      }

      const accountDetails = await account.get();
      
      // Check if player exists by userId
      const playerDoc = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        [Query.equal('userId', accountDetails.$id)]
      );

      let playerData;
      if (playerDoc.documents.length === 0) {
        // Only create new player if none exists
        playerData = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.PLAYERS,
          ID.unique(),
          {
            userId: accountDetails.$id,
            name: accountDetails.name,
            email: accountDetails.email,
            isAdmin: 'false',
            status: 'alive',
            role: 'crewmate' // Set default role
          }
        );

        setUser({ ...accountDetails, playerData });
        setIsAdmin(false);
      } else {
        // Use existing player data
        playerData = playerDoc.documents[0];
        setUser({
          ...accountDetails,
          playerData
        });
        setIsAdmin(playerData.isAdmin === 'true');
      }
      
      // Navigate based on role
      if (playerData.role === 'imposter') {
        navigate('/imposter');
      } else {
        navigate('/player');
      }
      setLoading(false);
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      setIsAdmin(false);
      navigate('/login');
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const redirectSuccess = window.location.origin + '/player';
      const redirectFailure = window.location.origin + '/login';
      
      await account.createOAuth2Session(
        'google',
        redirectSuccess,
        redirectFailure
      );
    } catch (error) {
      console.error('Login failed:', error);
      navigate('/login');
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setIsAdmin(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}