import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Plus,
  ShieldCheck,
  Send,
  Lock,
  Globe,
  Trash2,
  ThumbsUp,
  AlertTriangle,
  X,
  Target,
  GraduationCap,
  Building2,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { getAccount, getActiveUsername } from '../lib/accountManager';
import {
  CommunityGroup,
  GroupCategory,
  GroupPost,
  addGroupPost,
  createCommunityGroup,
  deleteGroup,
  getCommunityGroups,
  getGroupPosts,
  joinGroup,
  leaveGroup,
  togglePostLike
} from '../lib/communityStore';
import { RadianSymbol } from './RadianSymbol';

interface CommunityGroupsViewProps {
  onOpenLoginModal?: () => void;
}

export const CommunityGroupsView: React.FC<CommunityGroupsViewProps> = ({ onOpenLoginModal }) => {
  const activeUsername = getActiveUsername();
  const currentAccount = activeUsername ? getAccount(activeUsername) : null;

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [postInput, setPostInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Questionnaire Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupCategory, setGroupCategory] = useState<GroupCategory>('PEER_FRIENDS');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    'Maintain 95+ Safety Score',
    'Zero Harsh Braking Streak'
  ]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [roleWarning, setRoleWarning] = useState<string | null>(null);

  useEffect(() => {
    refreshGroups();
  }, [activeUsername]);

  const refreshGroups = () => {
    const loaded = getCommunityGroups();
    setGroups(loaded);
    if (loaded.length > 0) {
      if (!activeGroupId || !loaded.some((g) => g.id === activeGroupId)) {
        setActiveGroupId(loaded[0].id);
        loadPosts(loaded[0].id);
      } else {
        loadPosts(activeGroupId);
      }
    } else {
      setActiveGroupId(null);
      setPosts([]);
    }
  };

  const loadPosts = (groupId: string) => {
    const loadedPosts = getGroupPosts(groupId);
    setPosts(loadedPosts);
  };

  const handleSelectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    loadPosts(groupId);
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUsername || !currentAccount) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }

    if (!groupName.trim()) return;

    // Check Role Restrictions
    const role = currentAccount.role;
    if (groupCategory === 'DRIVING_SCHOOL' && role !== 'driving_instructor') {
      setRoleWarning('Driving School Cohorts can only be created by verified Driving Instructors.');
      return;
    }
    if (groupCategory === 'PARENT_MENTOR' && role !== 'parent_mentor' && role !== 'driving_instructor') {
      setRoleWarning('Parent-Mentor Advisory groups are restricted to Parent / Mentor and Instructor accounts.');
      return;
    }

    const created = createCommunityGroup({
      name: groupName.trim(),
      description: groupDescription.trim() || 'A community safety circle focused on smooth defensive road skills.',
      category: groupCategory,
      creatorUsername: activeUsername,
      creatorRole: currentAccount.role,
      goals: selectedGoals,
      isPrivate,
      passcode: isPrivate ? passcode.trim() : undefined
    });

    setGroupName('');
    setGroupDescription('');
    setGroupCategory('PEER_FRIENDS');
    setSelectedGoals(['Maintain 95+ Safety Score']);
    setIsPrivate(false);
    setPasscode('');
    setRoleWarning(null);
    setShowCreateModal(false);

    refreshGroups();
    setActiveGroupId(created.id);
  };

  const handleJoinLeave = (group: CommunityGroup) => {
    if (!activeUsername) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }

    const isMember = group.members.includes(activeUsername);
    if (isMember) {
      leaveGroup(group.id, activeUsername);
    } else {
      joinGroup(group.id, activeUsername);
    }
    refreshGroups();
  };

  const handleDeleteGroup = (group: CommunityGroup) => {
    if (!activeUsername) return;
    if (window.confirm(`Delete safety group "${group.name}"?`)) {
      deleteGroup(group.id, activeUsername);
      refreshGroups();
    }
  };

  const handleSendPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !postInput.trim() || !activeUsername) return;

    const added = addGroupPost(activeGroupId, postInput);
    if (added) {
      setPosts((prev) => [...prev, added]);
      setPostInput('');
    }
  };

  const handleLikePost = (postId: string) => {
    if (!activeGroupId || !activeUsername) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    togglePostLike(activeGroupId, postId, activeUsername);
    loadPosts(activeGroupId);
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isMemberOfActiveGroup = Boolean(activeGroup && activeUsername && activeGroup.members.includes(activeUsername));

  const availableGoals = [
    'Maintain 95+ Safety Score',
    'Complete 50 Supervised GDL Hours',
    'Zero Harsh Braking Streak',
    'Zero Speed Limit Violations',
    'Safe Night Driving Mastery',
    'Smooth Commute Continuity'
  ];

  const categoryOptions: {
    id: GroupCategory;
    title: string;
    description: string;
    icon: React.ReactNode;
    restrictedTo?: string;
  }[] = [
    {
      id: 'PEER_FRIENDS',
      title: 'Friends & Peer Driving Circle',
      description: 'Open to young drivers, teens, and permit learners.',
      icon: <Users className="w-4 h-4 text-[#A38258]" />
    },
    {
      id: 'HIGH_SCHOOL',
      title: 'High School Teen Driver Club',
      description: 'School-based teen drivers practicing defensive driving.',
      icon: <GraduationCap className="w-4 h-4 text-stone-900" />
    },
    {
      id: 'NEIGHBORHOOD',
      title: 'Neighborhood Safety Watch',
      description: 'Local community drivers and parents advocating safe speeds.',
      icon: <HeartHandshake className="w-4 h-4 text-emerald-700" />
    },
    {
      id: 'DRIVING_SCHOOL',
      title: 'Official Driving School Class Cohort',
      description: 'Instructor-managed student roster for driving lessons.',
      icon: <Building2 className="w-4 h-4 text-indigo-700" />,
      restrictedTo: 'Driving Instructors only'
    },
    {
      id: 'PARENT_MENTOR',
      title: 'Parent & Mentor Advisory Circle',
      description: 'Parent coaching and supervisor coordination space.',
      icon: <ShieldCheck className="w-4 h-4 text-amber-700" />,
      restrictedTo: 'Parents / Mentors & Instructors only'
    }
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="luxury-card p-6 border border-[#C5A880]/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#C5A880] flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 font-display tracking-tight">
                Driver Circles & Community Groups
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Join verified peer circles with friends, high school classmates, or driving cohorts.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!activeUsername && onOpenLoginModal) {
                onOpenLoginModal();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="btn-gold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Safety Group</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {groups.length === 0 ? (
        <div className="luxury-card p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6 text-stone-600" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-stone-900 font-display">No Community Groups Created Yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Start a custom circle for your high school classmates, neighborhood, or peer friend group to track collective smoothness and share tips!
            </p>
          </div>

          <button
            onClick={() => {
              if (!activeUsername && onOpenLoginModal) {
                onOpenLoginModal();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Launch First Safety Circle</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Groups List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="card-title block mb-0">
                Safety Circles ({filteredGroups.length})
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[11px] font-bold text-[#A38258] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> New Circle
              </button>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circles..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#C5A880]"
            />

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredGroups.map((grp) => {
                const isSelected = grp.id === activeGroupId;
                const isMember = Boolean(activeUsername && grp.members.includes(activeUsername));
                const isCreator = grp.creatorUsername === activeUsername;

                return (
                  <div
                    key={grp.id}
                    onClick={() => handleSelectGroup(grp.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 relative ${
                      isSelected
                        ? 'bg-white border-[#C5A880] shadow-md'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {grp.isPrivate ? (
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-[#A38258] shrink-0" />
                          )}
                          <span className="text-xs font-bold text-stone-900 truncate max-w-[150px]">{grp.name}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          by @{grp.creatorUsername}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {grp.avgSafetyScore} pts
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-600 line-clamp-2">{grp.description}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-500 font-mono">
                      <span>{grp.members.length} {grp.members.length === 1 ? 'member' : 'members'}</span>

                      <div className="flex items-center gap-1.5">
                        {isCreator && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(grp);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                            title="Delete Circle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinLeave(grp);
                          }}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            isMember
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'btn-gold'
                          }`}
                        >
                          {isMember ? 'Joined' : '+ Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Discussion Feed (8 cols) */}
          {activeGroup && (
            <div className="lg:col-span-8 luxury-card p-6 flex flex-col justify-between space-y-4 min-h-[500px]">
              {/* Header */}
              <div className="space-y-2 pb-3 border-b border-stone-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 font-display">{activeGroup.name}</h3>
                    <p className="text-xs text-stone-500">{activeGroup.description}</p>
                  </div>

                  <button
                    onClick={() => handleJoinLeave(activeGroup)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isMemberOfActiveGroup
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'btn-gold'
                    }`}
                  >
                    {isMemberOfActiveGroup ? 'Joined Member' : '+ Join Circle'}
                  </button>
                </div>

                {/* Goals */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  {activeGroup.goals.map((g, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[10px] text-stone-600 flex items-center gap-1"
                    >
                      <Target className="w-2.5 h-2.5 text-[#A38258]" />
                      <span>{g}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Discussion Stream */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
                {posts.length === 0 ? (
                  <div className="p-6 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                    <MessageSquare className="w-6 h-6 text-stone-400 mx-auto" />
                    <p className="text-xs text-stone-500">No posts in this circle yet. Share a safety tip!</p>
                  </div>
                ) : (
                  posts.map((post) => {
                    const hasLiked = Boolean(activeUsername && post.likes.includes(activeUsername));
                    return (
                      <div
                        key={post.id}
                        className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-stone-900 text-[#C5A880] flex items-center justify-center text-[9px] font-bold">
                              {post.senderUsername.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-stone-900">@{post.senderUsername}</span>
                            <span className="text-[10px] text-stone-400">({post.senderRole})</span>
                          </div>

                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            {post.senderScore} pts
                          </span>
                        </div>

                        <p className="text-xs text-stone-700 pl-7">{post.content}</p>

                        <div className="flex items-center justify-between pl-7 pt-1 text-[10px] text-stone-400">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={`flex items-center gap-1 text-xs cursor-pointer ${
                              hasLiked ? 'text-[#A38258] font-bold' : 'text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{post.likes.length}</span>
                          </button>
                          <span>Verified Circle Member</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendPost} className="pt-2 border-t border-stone-100 flex items-center gap-2">
                <input
                  type="text"
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  placeholder={
                    isMemberOfActiveGroup
                      ? `Post in ${activeGroup.name}...`
                      : `Join circle to post...`
                  }
                  disabled={!isMemberOfActiveGroup}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#C5A880] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isMemberOfActiveGroup || !postInput.trim()}
                  className="btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Questionnaire Modal: Create Safety Circle */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="luxury-card max-w-xl w-full p-6 border border-[#C5A880]/30 shadow-2xl relative max-h-[90vh] overflow-y-auto text-left">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setRoleWarning(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-5">
              <div className="border-b border-stone-100 pb-3">
                <h3 className="text-lg font-bold text-stone-900 font-display">Launch Safety Circle</h3>
                <p className="text-xs text-stone-500">Configure collective benchmarks and access controls.</p>
              </div>

              {roleWarning && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{roleWarning}</span>
                </div>
              )}

              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Circle Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value);
                      setRoleWarning(null);
                    }}
                    placeholder="e.g. West Lake High Drivers, Oakridge Peer Circle"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Focus / Mission</label>
                  <textarea
                    rows={2}
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Describe the group safety focus"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                {/* Category Options */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <span className="card-title block">Select Circle Type</span>
                  <div className="space-y-1.5">
                    {categoryOptions.map((opt) => {
                      const isSelected = groupCategory === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setGroupCategory(opt.id);
                            setRoleWarning(null);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-white border-[#C5A880] shadow-xs'
                              : 'bg-stone-50 border-stone-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">{opt.icon}</div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-stone-900">{opt.title}</span>
                                {opt.restrictedTo && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    {opt.restrictedTo}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500">{opt.description}</p>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? 'border-[#A38258] bg-[#A38258]' : 'border-stone-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <span className="card-title block">Target Goals</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {availableGoals.map((goal) => {
                      const checked = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              setSelectedGoals((prev) => prev.filter((g) => g !== goal));
                            } else {
                              setSelectedGoals((prev) => [...prev, goal]);
                            }
                          }}
                          className={`p-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                            checked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          <span className="text-[11px]">{goal}</span>
                          {checked && <Check className="w-3 h-3 text-emerald-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold px-5 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Launch Circle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
