import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, DATABASE_ID, COLLECTIONS } from '../appwrite/config';
import { ID, Query } from 'appwrite';
// import { generatePlayerTasks } from '../utils/taskGenerator';

function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [emergencyMeetingActive, setEmergencyMeetingActive] = useState(false);
  const [error, setError] = useState(null);
  const [gameSummary, setGameSummary] = useState({
    total: 0,
    alive: 0,
    dead: 0,
    imposters: 0
  });

  // Fetch players and game summary
  const fetchPlayers = async () => {
    try {
      // Implement logic to fetch players from your database
      // This is a placeholder and should be replaced with actual Appwrite query
      const playersResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAYERS
      );

      const fetchedPlayers = playersResponse.documents;
      setPlayers(fetchedPlayers);

      // Calculate game summary
      const summary = {
        total: fetchedPlayers.length,
        alive: fetchedPlayers.filter(p => p.status === 'alive').length,
        dead: fetchedPlayers.filter(p => p.status === 'dead').length,
        imposters: fetchedPlayers.filter(p => p.role === 'imposter').length
      };
      setGameSummary(summary);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

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
      
      const tasksUpdate = players.map(player => 
        databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.TASKS,
          player.tasks[0]?.$id,
          { visible: 'true' }
        )
      );
      
      await Promise.all(tasksUpdate);
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
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.TASKS,
        task.$id,
        { approved: 'true' }
      );
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
            <p className="text-gray-400">Game Master Controls</p>
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
                  className={`bg-gray-700 rounded p-4 cursor-pointer ${
                    selectedPlayer?.$id === player.$id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedPlayer(player)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{player.name}</h3>
                      <p className="text-sm text-gray-400">
                        Status: {player.status}
                        {player.isAdmin === 'true' && (
                          <span className="ml-2 text-yellow-500">(Admin)</span>
                        )}
                        {player.role === 'imposter' && (
                          <span className="ml-2 text-red-500">(Imposter)</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRole(player.$id, player.role || 'crewmate');
                        }}
                        className={`px-3 py-1 rounded ${
                          player.role === 'imposter'
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
                        className={`px-3 py-1 rounded ${
                          player.isAdmin === 'true'
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
                        {task.externalLink && (
                          <a 
                            href={task.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm mt-1 block"
                          >
                            View Task
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-2 py-1 rounded text-sm ${
                          task.completed === 'true' 
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
                        <span className={`px-2 py-1 rounded text-sm ${
                          task.visible === 'true' 
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