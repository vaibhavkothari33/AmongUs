import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases, client, DATABASE_ID, COLLECTIONS } from '../appwrite/config';
import { Query, ID } from 'appwrite';
import { useNavigate } from 'react-router-dom';

// Task Categories
const CODING_TASKS = [
    {
        title: 'Fix the Authentication Bug',
        description: 'Debug and fix the login authentication system. The bug is causing users to be logged out randomly.',
        location: 'Security Room',
        type: 'coding',
        externalLink: 'https://leetcode.com/problems/design-authentication-manager/'
    },
    {
        title: 'Optimize Database Queries',
        description: 'Improve the performance of database queries in the reactor monitoring system.',
        location: 'Server Room',
        type: 'coding',
        externalLink: 'https://leetcode.com/problems/optimize-table-queries/'
    }
];

const PHYSICAL_TASKS = [
    {
        title: 'Calibrate Sensors',
        description: 'Visit the sensor room and manually calibrate all environmental sensors.',
        location: 'Sensor Room',
        type: 'physical',
        externalLink: 'https://among-us-vk.vercel.app/tasks/calibrate'
    },
    {
        title: 'Check Electrical Wiring',
        description: 'Inspect and report the status of electrical connections in the maintenance panel.',
        location: 'Electrical',
        type: 'physical',
        externalLink: 'https://among-us-vk.vercel.app/tasks/electrical'
    }
];

const EXTERNAL_TASKS = [
    {
        title: 'Complete Security Training',
        description: 'Take the mandatory security awareness training course.',
        location: 'Admin Room',
        type: 'external',
        externalLink: 'https://www.hackerrank.com/skills-verification/security'
    },
    {
        title: 'System Architecture Review',
        description: 'Review and document the current system architecture.',
        location: 'Navigation',
        type: 'external',
        externalLink: 'https://www.coursera.org/learn/system-architecture'
    }
];

// Main component function
function PlayerDashboard() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    // State Management
    const [tasks, setTasks] = useState([]);
    const [gameStatus, setGameStatus] = useState('alive');
    const [currentTask, setCurrentTask] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Emergency Meeting States
    const [emergencyMeetingCooldown, setEmergencyMeetingCooldown] = useState(0);
    const [emergencyMeetingInProgress, setEmergencyMeetingInProgress] = useState(false);
    const EmergencyMeetingCooldown = 30; // 60 seconds cooldown

    // Emergency Meeting Countdown Timer
    useEffect(() => {
        let cooldownTimer;
        if (emergencyMeetingCooldown > 0) {
            cooldownTimer = setTimeout(() => {
                setEmergencyMeetingCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(cooldownTimer);
    }, [emergencyMeetingCooldown]);

    // Emergency Meeting Handler
    const handleEmergencyMeeting = async () => {
        if (emergencyMeetingCooldown > 0 || gameStatus !== 'alive') return;

        try {
            // Create an emergency meeting document
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.EVENTS,
                ID.unique(),
                {
                    type: 'emergency_meeting',
                    calledBy: user.playerData.$id,
                    callerName: user.playerData.name, // Added caller's name for the alert
                    timestamp: new Date().toISOString(),
                    status: 'active'
                }
            );

            setEmergencyMeetingCooldown(EmergencyMeetingCooldown);
            setEmergencyMeetingInProgress(true);

            setTimeout(() => {
                setEmergencyMeetingInProgress(false);
            }, 30000);

        } catch (error) {
            console.error('Emergency Meeting Error:', error);
            alert('Failed to call emergency meeting. Please try again.');
        }
    };

    // Generate tasks for a player
    const generatePlayerTasks = (playerId) => {
        if (!playerId) {
            console.error('No playerId provided to generatePlayerTasks');
            return [];
        }
    
        const allTasks = [
            CODING_TASKS[Math.floor(Math.random() * CODING_TASKS.length)],
            PHYSICAL_TASKS[Math.floor(Math.random() * PHYSICAL_TASKS.length)],
            EXTERNAL_TASKS[Math.floor(Math.random() * EXTERNAL_TASKS.length)]
        ];
    
        return allTasks.map((task, index) => ({
            title: task.title,
            description: task.description,
            location: task.location,
            type: task.type,
            externalLink: task.externalLink,
            playerId: playerId,  // Use the playerId parameter passed to the function
            completed: 'false',
            approved: 'false',
            visible: index === 0 ? 'true' : 'false',
            order: index + 1
        }));
    };
    // Process task response function
    const processTaskResponse = (response) => {
        const sortedTasks = response.documents.sort((a, b) => a.order - b.order);
        const currentTask = sortedTasks.find(task =>
            task.visible === true && task.completed === false
        );

        setCurrentTask(currentTask || null);
        setTasks(sortedTasks);
        setGameStatus(user.playerData.status);
    };

    // Fetch tasks from database
    const fetchTasks = async () => {
        try {
          setIsLoading(true); // Add loading state
          
          if (!user?.playerData?.$id) {
            console.error('No user data available');
            return;
          }

          const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            [
              Query.equal('playerId', user.playerData.$id),
              Query.orderAsc('order')  // Add ordering
            ]
          );
      
          if (response.documents.length === 0) {
            const initialTasks = generatePlayerTasks(user.playerData.$id);
            
            const createdTasks = await Promise.all(initialTasks.map(task => {
              return databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.TASKS,
                ID.unique(),
                {
                  playerId: user.playerData.$id,
                  title: task.title,
                  description: task.description,
                  location: task.location,
                  type: task.type,
                  approved: false,
                  visible: task.visible === 'true',
                  order: parseInt(task.order),
                  externalLink: task.externalLink || 'https://among-us-vk.vercel.app',
                  completed: false
                }
              );
            }));
            
            processTaskResponse({ documents: createdTasks });
          } else {
            processTaskResponse(response);
          }
        } catch (error) {
          console.error('Error fetching/creating tasks:', error);
        } finally {
          setIsLoading(false); // Clear loading state
        }
    };

    // Update the subscription setup
    useEffect(() => {
        if (!user?.playerData?.$id) return;

        let retryCount = 0;
        const maxRetries = 3;
        
        const setupSubscription = async () => {
            try {
                const unsubscribe = client.subscribe([
                    `databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents`,
                ], response => {
                    if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents.update`)) {
                        if (response.payload.playerId === user.playerData.$id) {
                            fetchTasks();
                        }
                    }
                });

                return unsubscribe;
            } catch (error) {
                console.error('Subscription error:', error);
                if (retryCount < maxRetries) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return setupSubscription();
                }
            }
        };

        const subscription = setupSubscription();
        
        return () => {
            if (subscription) {
                subscription.then(unsubscribe => unsubscribe && unsubscribe());
            }
        };
    }, [user]);

    const completeTask = async (taskId) => {
        try {
          const updatedTask = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            taskId,
            {
              completed: true  // Changed from 'true' to true
            }
          );
          
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.$id === taskId ? {...task, completed: true} : task
            )
          );
          
          return updatedTask;
        } catch (error) {
          console.error('Error completing task:', error);
          throw error;
        }
    };

    // Handle task completion
    const handleCompleteTask = async (taskId) => {
        try {
            // Mark the current task as completed
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.TASKS,
                taskId,
                { 
                    completed: true,  // Changed from 'true' to true
                    playerId: user.playerData.$id
                }
            );

            // Find the next task in order and make it visible
            const completedTaskIndex = tasks.findIndex(task => task.$id === taskId);
            const nextTask = tasks[completedTaskIndex + 1];
            
            if (nextTask) {
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.TASKS,
                    nextTask.$id,
                    { 
                        visible: true,  // Changed from 'true' to true
                        playerId: user.playerData.$id
                    }
                );
            }

            // Fetch updated tasks
            await fetchTasks();
        } catch (error) {
            console.error('Error completing task:', error);
            alert('Failed to complete task. Please try again.');
        }
    };

    // Fetch tasks when user changes
    useEffect(() => {
        if (user?.playerData?.$id) {
            console.log("User changed, fetching tasks for:", user.playerData.$id);
            fetchTasks();
        } else {
            console.log("No user or playerData available:", user);
        }
    }, [user]);

    // Subscribe to player status updates
    useEffect(() => {
        if (!user?.playerData?.$id) {
            console.log("Cannot subscribe to player updates - no playerData");
            return;
        }

        console.log("Setting up player status subscription for:", user.playerData.$id);
        
        const unsubscribe = client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents`,
        ], (response) => {
            if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.PLAYERS}.documents.update`)) {
                if (user?.playerData?.$id === response.payload.$id) {
                    console.log("Received player update:", response.payload);
                    setGameStatus(response.payload.status);
                    
                    if (response.payload.status === 'dead') {
                        navigate('/spectator');
                    } else if (response.payload.role === 'imposter') {
                        navigate('/imposter');
                    }
                }
            }
        });
    
        return () => {
            console.log("Unsubscribing from player updates");
            unsubscribe();
        };
    }, [user, navigate]);

    // Subscribe to emergency meeting events
    useEffect(() => {
        console.log("Setting up emergency meeting subscription");
        
        const unsubscribe = client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.EVENTS}.documents`,
        ], (response) => {
            if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.EVENTS}.documents.create`)) {
                if (response.payload.type === 'emergency_meeting') {
                    console.log("Emergency meeting event received:", response.payload);
                    const callerName = response.payload.callerName || 'Someone';
                    alert(`⚠️ EMERGENCY MEETING CALLED!\n${callerName} has called an emergency meeting!`);
                }
            }
        });
    
        return () => {
            console.log("Unsubscribing from emergency meeting events");
            unsubscribe();
        };
    }, []);

    // Subscribe to task updates
    useEffect(() => {
        if (!user?.playerData?.$id) {
            console.log("Cannot subscribe to task updates - no playerData");
            return;
        }

        console.log("Setting up task subscription for player:", user.playerData.$id);
        
        const taskSubscription = client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents`,
        ], (response) => {
            if (response.events.includes(`databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents.update`)) {
                console.log("Task update received:", response.payload);
                // Only fetch if this task belongs to the current player
                if (response.payload.playerId === user.playerData.$id) {
                    fetchTasks();
                }
            }
        });
    
        return () => {
            console.log("Unsubscribing from task updates");
            taskSubscription();
        };
    }, [user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Loading tasks...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Crewmate</h1>
                        <p className="text-gray-400">Welcome, {user?.playerData?.name || 'Player'}</p>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Admin Panel
                            </button>
                        )}
                        <button
                            onClick={logout}
                            className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                        >
                            Leave Game
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">Status</h2>
                            <p className="text-lg">
                                Current Status: <span className="font-bold capitalize">{gameStatus}</span>
                            </p>
                        </div>
                        {gameStatus === 'alive' && (
                            <button
                                onClick={handleEmergencyMeeting}
                                disabled={emergencyMeetingCooldown > 0}
                                className={`px-4 py-2 rounded ${
                                    emergencyMeetingCooldown > 0 
                                        ? 'bg-gray-600 cursor-not-allowed' 
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {emergencyMeetingCooldown > 0 
                                    ? `Cooldown (${emergencyMeetingCooldown}s)` 
                                    : 'Call Emergency Meeting'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
                    <div className="grid gap-4">
                        {currentTask ? (
                            <div className="bg-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{currentTask.title}</h3>
                                        <p className="text-gray-400 mt-1">{currentTask.description}</p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Location: {currentTask.location} | Type: {currentTask.type}
                                        </p>
                                        {currentTask.externalLink && (
                                            <a
                                                href={currentTask.externalLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                                            >
                                                Start Task
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <span className="px-3 py-1 rounded bg-yellow-500">
                                            Current Task
                                        </span>
                                        <button
                                            onClick={() => handleCompleteTask(currentTask.$id)}
                                            className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 text-sm"
                                        >
                                            Mark Complete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-4">
                                {tasks.length === 0
                                    ? "No tasks available yet."
                                    : tasks.every(task => task.completed === 'true' && task.approved === 'true')
                                        ? "All tasks completed!"
                                        : "Waiting for admin approval..."}
                            </p>
                        )}
                        
                        {/* Completed Tasks Section */}
                        {tasks.filter(task => task.completed === true).map((task) => (
                            <div key={task.$id} className="bg-gray-700/50 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{task.title}</h3>
                                        <p className="text-gray-400 mt-1">{task.description}</p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Location: {task.location} | Type: {task.type}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <span className="px-3 py-1 rounded bg-green-500">
                                            Completed
                                        </span>
                                        <span className={`px-3 py-1 rounded ${
                                            task.approved === true ? 'bg-green-500' : 'bg-yellow-500'
                                        }`}>
                                            {task.approved === true ? 'Approved' : 'Waiting Approval'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlayerDashboard;