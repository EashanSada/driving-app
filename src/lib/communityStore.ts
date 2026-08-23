import { UserAccount, getAccount, getActiveUsername } from './accountManager';

export type GroupCategory =
  | 'PEER_FRIENDS'
  | 'NEIGHBORHOOD'
  | 'HIGH_SCHOOL'
  | 'DRIVING_SCHOOL'
  | 'PARENT_MENTOR';

export interface SafetyGoal {
  id: string;
  label: string;
  targetMetric: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  category: GroupCategory;
  creatorUsername: string;
  creatorRole: string;
  createdAt: number;
  members: string[]; // List of real usernames
  goals: string[];
  isPrivate: boolean;
  passcode?: string;
  avgSafetyScore: number;
}

export interface GroupPost {
  id: string;
  groupId: string;
  senderUsername: string;
  senderRole: string;
  senderScore: number;
  content: string;
  createdAt: number;
  likes: string[]; // List of usernames who liked
  badge?: string;
}

const STORAGE_KEY_GROUPS = 'drivesafe_community_groups_v1';
const STORAGE_KEY_POSTS = 'drivesafe_community_posts_v1';

// Get all real community groups (starts empty - no fake groups)
export function getCommunityGroups(): CommunityGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GROUPS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Save community groups
export function saveCommunityGroups(groups: CommunityGroup[]) {
  try {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to save community groups', err);
  }
}

// Create a new safety group
export function createCommunityGroup(group: Omit<CommunityGroup, 'id' | 'createdAt' | 'members' | 'avgSafetyScore'>): CommunityGroup {
  const groups = getCommunityGroups();
  const activeUser = getActiveUsername() || 'anonymous';
  const activeAcc = getAccount(activeUser);

  const newGroup: CommunityGroup = {
    ...group,
    id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    members: [activeUser],
    avgSafetyScore: activeAcc?.safetyScore || 95
  };

  groups.unshift(newGroup);
  saveCommunityGroups(groups);
  return newGroup;
}

// Join a group
export function joinGroup(groupId: string, username: string): boolean {
  const groups = getCommunityGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;

  if (!group.members.includes(username)) {
    group.members.push(username);
    // Recalculate average safety score based on real members
    const scores = group.members.map((u) => getAccount(u)?.safetyScore || 95);
    group.avgSafetyScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    saveCommunityGroups(groups);
  }
  return true;
}

// Leave a group
export function leaveGroup(groupId: string, username: string): boolean {
  const groups = getCommunityGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;

  group.members = group.members.filter((u) => u !== username);
  if (group.members.length > 0) {
    const scores = group.members.map((u) => getAccount(u)?.safetyScore || 95);
    group.avgSafetyScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  }
  saveCommunityGroups(groups);
  return true;
}

// Delete group (only creator can delete)
export function deleteGroup(groupId: string, username: string): boolean {
  let groups = getCommunityGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group || group.creatorUsername !== username) return false;

  groups = groups.filter((g) => g.id !== groupId);
  saveCommunityGroups(groups);
  return true;
}

// Get posts for a group
export function getGroupPosts(groupId: string): GroupPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTS);
    if (!raw) return [];
    const allPosts: Record<string, GroupPost[]> = JSON.parse(raw);
    return allPosts[groupId] || [];
  } catch {
    return [];
  }
}

// Add a post to a group
export function addGroupPost(groupId: string, content: string): GroupPost | null {
  const username = getActiveUsername();
  if (!username) return null;
  const acc = getAccount(username);

  const newPost: GroupPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    groupId,
    senderUsername: username,
    senderRole: acc?.role === 'gdl_student' ? 'Permit Student' : acc?.role === 'parent_mentor' ? 'Parent / Mentor' : acc?.role === 'driving_instructor' ? 'Driving Instructor' : 'Young Driver',
    senderScore: acc?.safetyScore || 95,
    content: content.trim(),
    createdAt: Date.now(),
    likes: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTS);
    const allPosts: Record<string, GroupPost[]> = raw ? JSON.parse(raw) : {};
    if (!allPosts[groupId]) {
      allPosts[groupId] = [];
    }
    allPosts[groupId].push(newPost);
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(allPosts));
    return newPost;
  } catch {
    return null;
  }
}

// Toggle like on a post
export function togglePostLike(groupId: string, postId: string, username: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTS);
    if (!raw) return false;
    const allPosts: Record<string, GroupPost[]> = JSON.parse(raw);
    const groupPosts = allPosts[groupId];
    if (!groupPosts) return false;

    const post = groupPosts.find((p) => p.id === postId);
    if (!post) return false;

    if (post.likes.includes(username)) {
      post.likes = post.likes.filter((u) => u !== username);
    } else {
      post.likes.push(username);
    }

    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(allPosts));
    return true;
  } catch {
    return false;
  }
}
