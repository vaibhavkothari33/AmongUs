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
  const [loginError, setLoginError] = useState(null);
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
      console.log("Checking user session...");
      let session;
      
      try {
        session = await account.getSession('current');
        console.log("Session found:", session);
      } catch (error) {
        console.log("No active session found:", error.message);
        setLoading(false);
        setUser(null);
        setIsAdmin(false);
        // Don't navigate here - let the components handle redirects
        return;
      }

      console.log("Getting account details...");
      const accountDetails = await account.get();
      console.log("Account details:", accountDetails);

      // Check if player exists by userId
      console.log("Checking if player exists...");
      const playerDoc = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        [Query.equal('userId', accountDetails.$id)]
      );

      let playerData;
      if (playerDoc.documents.length === 0) {
        console.log("Creating new player...");
        // Create new player document
        const timestamp = new Date().toISOString();
        playerData = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.PLAYERS,
          ID.unique(),
          {
            userId: accountDetails.$id,
            playerId: accountDetails.$id,
            name: accountDetails.name,
            email: accountDetails.email,
            isAdmin: 'false',
            status: 'alive',
            role: 'crewmate',
            score: 0,
            // createdAt: timestamp,
            // updatedAt: timestamp,
            killedAt: null,
            killedBy: null
          }
        );

        console.log("New player created:", playerData);

        // Generate and create tasks for new player
        console.log("Generating tasks for new player...");
        const initialTasks = generatePlayerTasks();
        await Promise.all(initialTasks.map((task, index) => {
          // Fix data types and make first task visible
          return databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            ID.unique(),
            {
              playerId: playerData.$id,
              title: task.title,
              description: task.description,
              location: task.location,
              type: task.type,
              approved: true,
              visible: index === 0, // Only make the first task visible
              order: parseInt(task.order || 0),
              externalLink: task.externalLink || '',
              completed: false,
              createdAt: timestamp,
              updatedAt: timestamp
            }
          );
        }));

        setUser({ ...accountDetails, playerData });
        setIsAdmin(false);
      } else {
        // Use existing player data
        console.log("Using existing player data:", playerDoc.documents[0]);
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
      setLoginError(error.message);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      // Don't navigate here - let the components handle redirects
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
      console.log("Setting up realtime subscription for player:", playerDocId);
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
    } catch (error) {
      console.error('Failed to set up realtime subscription:', error);
    }
  };

  const login = async () => {
    try {
      console.log("Starting OAuth login process...");
      setLoginError(null);
      
      const redirectSuccess = window.location.origin + '/player';
      const redirectFailure = window.location.origin + '/login';

      console.log("Redirect URLs:", {
        success: redirectSuccess,
        failure: redirectFailure
      });

      // Clear any previous session first to avoid conflicts
      try {
        await account.deleteSession('current');
        console.log("Previous session deleted");
      } catch (err) {
        console.log("No previous session to delete");
      }

      // Create the OAuth session
      await account.createOAuth2Session(
        'google',
        redirectSuccess,
        redirectFailure
      );
      
      // Note: The page will redirect, so code after this won't execute
      console.log("OAuth session creation initiated...");
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(error.message);
      // Don't navigate here - the page will stay on the login page
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out...");
      // Clean up subscription before logging out
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
          subscriptionRef.current = null;
          console.log("Realtime subscription cleared");
        } catch (error) {
          console.log('Error unsubscribing:', error);
        }
      }

      await account.deleteSession('current');
      console.log("Session deleted");
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
      console.log("Updating user data:", updatedData);
      const updated = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        user.playerData.$id,
        {
          ...updatedData,
          updatedAt: new Date().toISOString()
        }
      );

      console.log("User data updated:", updated);
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
      updateUserData,
      loginError,
      checkUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}