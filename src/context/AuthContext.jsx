import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS, client } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { useNavigate } from 'react-router-dom';
import { generatePlayerTasks } from '../utils/taskGenerator';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const subscriptionRef = useRef(null);

  useEffect(() => {
    checkUser();
    
    // Cleanup function that runs when component unmounts
    return () => {
      // Make sure to unsubscribe when the component unmounts
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
        } catch (error) {
          console.log('Error unsubscribing:', error);
        }
      }
    };
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
        // Generate initial tasks for new player
        const initialTasks = generatePlayerTasks();
        
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
            role: 'crewmate', // Set default role
            tasks: initialTasks,
            score: 0,
            createdAt: new Date().toISOString()
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
      
      // Setup real-time subscription after user is confirmed
      setupRealtimeSubscription(playerData.$id);
      
      // Navigate based on role and status
      if (playerData.isAdmin === 'true') {
        navigate('/admin');
      } else if (playerData.status === 'dead') {
        navigate('/spectator');
      } else if (playerData.role === 'imposter') {
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

  const setupRealtimeSubscription = (playerDocId) => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current();
      } catch (error) {
        console.log('Error unsubscribing:', error);
      }
    }

    // Create a new subscription with error handling
    try {
      const unsubscribe = client.subscribe(
        [`databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents.${playerDocId}`],
        (response) => {
          console.log('Realtime update received:', response);
          
          if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents.${playerDocId}.update`)) {
            // Update local user data
            setUser(prevUser => ({
              ...prevUser,
              playerData: response.payload
            }));
            
            setIsAdmin(response.payload.isAdmin === 'true');

            // Handle role/status changes
            if (response.payload.isAdmin === 'true') {
              navigate('/admin');
            } else if (response.payload.status === 'dead') {
              navigate('/spectator');
            } else if (response.payload.role === 'imposter') {
              navigate('/imposter');
            } else {
              navigate('/player');
            }
          }
        }
      );
      
      // Store the unsubscribe function in the ref for later cleanup
      subscriptionRef.current = unsubscribe;
      
      console.log('Realtime subscription setup for player:', playerDocId);
    } catch (error) {
      console.error('Failed to set up realtime subscription:', error);
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
      // Clean up subscription before logging out
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
          subscriptionRef.current = null;
        } catch (error) {
          console.log('Error unsubscribing:', error);
        }
      }
      
      await account.deleteSession('current');
      setUser(null);
      setIsAdmin(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateUserData = async (updatedData) => {
    if (!user || !user.playerData) return;
    
    try {
      const updated = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        user.playerData.$id,
        updatedData
      );
      
      // Let the realtime subscription handle the update
      return updated;
    } catch (error) {
      console.error('Failed to update user data:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      isAdmin,
      updateUserData
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}