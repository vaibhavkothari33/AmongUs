import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, DATABASE_ID, COLLECTIONS } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import { useNavigate } from 'react-router-dom';

function ImposterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [gameStats, setGameStats] = useState({
    crewmates: 0,
    imposters: 0,
    alive: 0,
    eliminated: 0
  });
  const [emergencyMeetingCooldown, setEmergencyMeetingCooldown] = useState(false);

  useEffect(() => {
    if (user?.playerData?.role !== 'imposter') {
      navigate('/player');
      return;
    }
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [user]);

  const fetchPlayers = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        [Query.notEqual('userId', user.$id)]
      );

      const alivePlayers = response.documents.filter(p => p.status === 'alive');
      const deadPlayers = response.documents.filter(p => p.status === 'dead');
      
      setPlayers(alivePlayers);
      setEliminatedPlayers(deadPlayers);
      
      setGameStats({
        crewmates: response.documents.filter(p => p.role === 'crewmate' && p.status === 'alive').length,
        imposters: response.documents.filter(p => p.role === 'imposter' && p.status === 'alive').length,
        alive: alivePlayers.length,
        eliminated: deadPlayers.length
      });
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };
  const handleKillPlayer = async (playerId) => {
    try {
      // First get the current player data
      const player = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId
      );
  
      // Update the player while preserving their role
      // Only using attributes that exist in your schema
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId,
        { 
          status: 'dead',
          role: player.role || 'crewmate' // Preserve existing role
          // Removed the killedAt and killedBy attributes that caused the error
        }
      );
  
      // Create a kill event document to track kills instead of adding fields to player
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.KILL_EVENTS, // Make sure this collection exists
        ID.unique(),
        {
          killedPlayerId: playerId,
          killerPlayerId: user.$id,
          timestamp: new Date().toISOString()
        }
      );
      
      await fetchPlayers();
    } catch (error) {
      console.error('Error killing player:', error);
    }
  };

  const handleEmergencyMeeting = async () => {
    if (emergencyMeetingCooldown) return;

    try {
        await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.EMERGENCY_MEETINGS,
            ID.unique(),
            {
                calledBy: user.playerData.$id,
                callerName: user.playerData.name,
                timestamp: new Date().toISOString(),
                status: 'active',
                type: 'emergency'
            }
        );

        setEmergencyMeetingCooldown(true);
        setTimeout(() => {
            setEmergencyMeetingCooldown(false);
        }, 2 * 60 * 1000);

    } catch (error) {
        console.error('Error calling emergency meeting:', error);
        alert('Failed to call emergency meeting');
    }
};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-red-500">Imposter Dashboard</h1>
            <p className="text-gray-400">Eliminate the crew carefully...</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleEmergencyMeeting}
              disabled={emergencyMeetingCooldown}
              className={`px-4 py-2 rounded ${
                emergencyMeetingCooldown 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              {emergencyMeetingCooldown ? 'On Cooldown' : 'Emergency Meeting'}
            </button>
            <button
              onClick={logout}
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Leave Game
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Crewmates</h3>
            <p className="text-2xl text-blue-400">{gameStats.crewmates}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Imposters</h3>
            <p className="text-2xl text-red-400">{gameStats.imposters}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Total Alive</h3>
            <p className="text-2xl text-green-400">{gameStats.alive}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <h3 className="text-lg mb-2">Eliminated</h3>
            <p className="text-2xl text-red-400">{gameStats.eliminated}</p>
          </div>
        </div>

        {/* Eliminated Players Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Eliminated Players</h2>
          {eliminatedPlayers.length === 0 ? (
            <p className="text-gray-400 text-center">No players eliminated yet</p>
          ) : (
            <div className="grid gap-4">
              {eliminatedPlayers.map((player) => (
                <div key={player.$id} className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{player.name}</h3>
                      <p className="text-sm text-gray-400">
                        {player.role === 'imposter' ? 
                          <span className="text-red-400">Fellow Imposter</span> : 
                          <span className="text-blue-400">Crewmate</span>
                        }
                      </p>
                    </div>
                    <span className="text-sm text-red-400">☠️ Eliminated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Potential Targets</h2>
          {players.length === 0 ? (
            <p className="text-gray-400 text-center">No potential targets available</p>
          ) : (
            <div className="grid gap-4">
              {players.map((player) => (
                <div key={player.$id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{player.name}</h3>
                      <p className="text-sm text-gray-400">
                        Role: {player.role === 'imposter' ? 
                          <span className="text-red-400">Fellow Imposter</span> : 
                          <span className="text-blue-400">Crewmate</span>
                        }
                      </p>
                    </div>
                    {player.role !== 'imposter' && (
                      <button
                        onClick={() => handleKillPlayer(player.$id)}
                        className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
                      >
                        Eliminate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImposterDashboard;
