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
    externalLink: ''
  },
  {
    title: 'Check Electrical Wiring',
    description: 'Inspect and report the status of electrical connections in the maintenance panel.',
    location: 'Electrical',
    type: 'physical',
    externalLink: ''
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

export const generatePlayerTasks = (playerId) => {
  const allTasks = [
    CODING_TASKS[Math.floor(Math.random() * CODING_TASKS.length)],
    PHYSICAL_TASKS[Math.floor(Math.random() * PHYSICAL_TASKS.length)],
    EXTERNAL_TASKS[Math.floor(Math.random() * EXTERNAL_TASKS.length)]
  ];

  return allTasks.map((task, index) => ({
    ...task,
    playerId,
    completed: 'false',
    approved: 'false',
    visible: index === 0 ? 'true' : 'false',  // Make first task visible
    order: index + 1,
    externalLink: task.externalLink || 'https://among-us.com/no-external-link'
  }));
};