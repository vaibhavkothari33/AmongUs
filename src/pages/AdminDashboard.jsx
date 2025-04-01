import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client, DATABASE_ID, COLLECTIONS } from '../appwrite/config';
import { ID, Query } from 'appwrite';
// import { generatePlayerTasks } from '../utils/taskGenerator';
function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  // const [emergencyMeetingActive, setEmergencyMeetingActive] = useState(false);
  const [error, setError] = useState(null);
  const [gameSummary, setGameSummary] = useState({
    total: 0,
    alive: 0,
    dead: 0,
    imposters: 0
  });

  // Fetch players and game summary
  // Modify the fetchPlayers function
  const fetchPlayers = async () => {
    try {
      const playersResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAYERS
      );
  
      const fetchedPlayers = playersResponse.documents;
  
      // Fetch tasks for each player
      const playersWithTasks = await Promise.all(
        fetchedPlayers.map(async (player) => {
          const tasksResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            [Query.equal('playerId', player.$id)]
          );
          return {
            ...player,
            tasks: tasksResponse.documents
          };
        })
      );
  
      setPlayers(playersWithTasks);
  
      // Calculate game summary
      const summary = {
        total: playersWithTasks.length,
        alive: playersWithTasks.filter(p => p.status === 'alive').length,
        dead: playersWithTasks.filter(p => p.status === 'dead').length,
        imposters: playersWithTasks.filter(p => p.role === 'imposter').length
      };
      setGameSummary(summary);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  };

  useEffect(() => {
    fetchPlayers();

    const unsubscribe = client.subscribe([
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents`,
    ], (response) => {
      if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents.update`)) {
        // Refresh players list when any player is updated
        fetchPlayers();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  fetchPlayers();
  const handleStartGame = async () => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GAME_STATE,
        ID.unique(),
        {
          status: 'active',
          startedAt: new Date().toISOString(),
          startedBy: user.$id
        }
      );

      // Fetch first task for each player and make it visible
      const playerTasks = await Promise.all(
        players.map(async (player) => {
          const tasks = player.tasks;
          if (tasks && tasks.length > 0) {
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.TASKS,
              tasks[0].$id,
              { visible: 'true' }
            );
          }
        })
      );

      setGameState('active');
      await fetchPlayers();
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start game');
    }
  };

  const handleEndGame = async () => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GAME_STATE,
        ID.unique(),
        {
          status: 'ended',
          endedAt: new Date().toISOString(),
          endedBy: user.$id
        }
      );
      setGameState('ended');
    } catch (error) {
      console.error('Error ending game:', error);
      setError('Failed to end game');
    }
  };

  const handleRevivePlayer = async (playerId) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId,
        { status: 'alive' }
      );
      await fetchPlayers();
    } catch (error) {
      console.error('Error reviving player:', error);
      setError('Failed to revive player');
    }
  };

  const handleKillPlayer = async (playerId) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId,
        { status: 'dead' }
      );
      await fetchPlayers();
    } catch (error) {
      console.error('Error killing player:', error);
      setError('Failed to kill player');
    }
  };

  const handleToggleRole = async (playerId, currentRole) => {
    try {
      const newRole = currentRole === 'imposter' ? 'crewmate' : 'imposter';
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId,
        { role: newRole }
      );
      await fetchPlayers();
    } catch (error) {
      console.error('Error toggling player role:', error);
      setError('Failed to change player role');
    }
  };

  const handleToggleAdmin = async (playerId, currentAdminStatus) => {
    try {
      const newAdminStatus = currentAdminStatus === 'true' ? 'false' : 'true';
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAYERS,
        playerId,
        { isAdmin: newAdminStatus }
      );
      await fetchPlayers();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setError('Failed to change admin status');
    }
  };

  const handleApproveTask = async (task) => {
    try {
      // Mark current task as approved
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TASKS,
        task.$id,
        { 
          approved: 'true',
          // Make sure playerId is included if it's required
          playerId: selectedPlayer.$id 
        }
      );
      
      // Find and make the next task visible
      const playerTasks = selectedPlayer.tasks.sort((a, b) => a.order - b.order);
      const currentTaskIndex = playerTasks.findIndex(t => t.$id === task.$id);
      const nextTask = playerTasks[currentTaskIndex + 1];
      
      if (nextTask) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TASKS,
          nextTask.$id,
          { 
            visible: 'true',
            // Make sure playerId is included if it's required
            playerId: selectedPlayer.$id
          }
        );
      }
  
      await fetchPlayers();
    } catch (error) {
      console.error('Error approving task:', error);
      setError('Failed to approve task');
    }
  };
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-600 text-white p-4 rounded mb-4">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            {/* <p className="text-gray-400">Game Master Controls</p> */}
          </div>
          <button
            onClick={logout}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
          >
            Exit Admin Panel
          </button>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Game Controls</h2>
              <p className="text-gray-400">Current State: {gameState}</p>
            </div>
            <div className="flex gap-4">
              {gameState === 'waiting' && (
                <button
                  onClick={handleStartGame}
                  className="bg-green-600 px-6 py-2 rounded-lg hover:bg-green-700"
                >
                  Start Game
                </button>
              )}
              {gameState === 'active' && (
                <button
                  onClick={handleEndGame}
                  className="bg-red-600 px-6 py-2 rounded-lg hover:bg-red-700"
                >
                  End Game
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold">Total Players</h3>
            <p className="text-2xl">{gameSummary.total}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold">Alive</h3>
            <p className="text-2xl text-green-500">{gameSummary.alive}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold">Dead</h3>
            <p className="text-2xl text-red-500">{gameSummary.dead}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold">Imposters</h3>
            <p className="text-2xl text-purple-500">{gameSummary.imposters}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Players</h2>
            <div className="space-y-4">
              {players.map((player) => (
                <div
                  key={player.$id}
                  className={`bg-gray-700 rounded p-4 flex items-center gap-4 cursor-pointer ${selectedPlayer?.$id === player.$id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  {/* <img
                    src={player.prefs || '/default-avatar.png'} // Fallback image
                    alt={player.name}
                    className="w-12 h-12 rounded-full object-cover"
                  /> */}
                  <div className="flex-1">
                    <h3 className="font-semibold">{player.name}</h3>
                    <p className="text-sm text-gray-400">
                      Status: {player.status}
                      {player.isAdmin === 'true' && <span className="ml-2 text-yellow-500">(Admin)</span>}
                      {player.role === 'imposter' && <span className="ml-2 text-red-500">(Imposter)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRole(player.$id, player.role || 'crewmate');
                      }}
                      className={`px-3 py-1 rounded ${player.role === 'imposter'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {player.role === 'imposter' ? 'Make Crewmate' : 'Make Imposter'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAdmin(player.$id, player.isAdmin);
                      }}
                      className={`px-3 py-1 rounded ${player.isAdmin === 'true'
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {player.isAdmin === 'true' ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    {player.status === 'alive' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleKillPlayer(player.$id);
                        }}
                        className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
                      >
                        Kill
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevivePlayer(player.$id);
                        }}
                        className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
                      >
                        Revive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPlayer && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">
                {selectedPlayer.name}'s Tasks
              </h2>
              <div className="space-y-4">
                {selectedPlayer.tasks?.map((task) => (
                  <div key={task.$id} className="bg-gray-700 rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-gray-400">{task.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Location: {task.location} | Type: {task.type}
                        </p>
                        {task.visible === 'true' ? 'Current' : `Task ${task.order}`}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-2 py-1 rounded text-sm ${task.completed === 'true'
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                          }`}>
                          {task.completed === 'true' ? 'Completed' : 'Pending'}
                        </span>
                        {task.completed === 'true' && task.approved === 'false' && (
                          <button
                            onClick={() => handleApproveTask(task)}
                            className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 text-sm"
                          >
                            Approve Task
                          </button>
                        )}
                        <span className={`px-2 py-1 rounded text-sm ${task.visible === 'true'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                          }`}>
                          {task.visible === 'true' ? 'Current' : `Task ${task.order}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;