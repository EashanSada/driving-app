import React, { useState } from 'react';
import { Users, MessageSquare, Plus, Send, Heart, Award, ShieldCheck, Sparkles, UserPlus, Globe, Check } from 'lucide-react';
import { GroupMessage, UserProfile, YouthGroup } from '../types';

export const CommunityView: React.FC = () => {
  const [userProfile] = useState<UserProfile>({
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Alex Rivera',
    email: 'alex.rivera@drivesafe.org',
    youth_cohort: 'West Coast Youth Safety Club',
    level: 4,
    current_xp: 3450,
    next_level_xp: 5000,
    total_points: 2420,
    safety_score: 98.5,
    total_distance_miles: 320.5,
    clean_trips_count: 40,
    badges_unlocked: ['100_MILES_SAFE', 'PERFECT_WEEK', 'PLATINUM_GUARDIAN'],
    joined_date: 'Oct 2024'
  });

  const [groups, setGroups] = useState<YouthGroup[]>([
    {
      id: 'group_1',
      name: 'West Coast Youth Safety Club',
      description: 'High school & college youth drivers practicing zero-distraction safe driving across CA and OR.',
      category: 'REGIONAL',
      member_count: 128,
      avg_group_score: 96.4,
      is_joined: true,
      avatar_color: '#2dd4bf'
    },
    {
      id: 'group_2',
      name: 'Campus Eco-Navigators',
      description: 'University drivers focused on smooth braking, fuel-efficient momentum, and road hazard reporting.',
      category: 'ECO_DRIVERS',
      member_count: 85,
      avg_group_score: 94.8,
      is_joined: true,
      avatar_color: '#a78bfa'
    },
    {
      id: 'group_3',
      name: 'Madrid Safe Teen Drivers',
      description: 'Spanish youth drivers collaborating on urban safety and night driving milestones.',
      category: 'SCHOOL',
      member_count: 64,
      avg_group_score: 92.1,
      is_joined: false,
      avatar_color: '#f59e0b'
    }
  ]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('group_1');

  const [messages, setMessages] = useState<GroupMessage[]>([
    {
      id: 'msg_1',
      group_id: 'group_1',
      sender_name: 'Maria Garcia',
      sender_role: 'Group Captain',
      content: 'Hey everyone! Just logged a clean 25-mile trip with 0 harsh brakes near downtown!',
      timestamp: '10:42 AM',
      reactions_count: 8,
      achievement_share: {
        title: 'Perfect Trip Badge',
        score: 99.2,
        badge: 'Gold Guardian'
      }
    },
    {
      id: 'msg_2',
      group_id: 'group_1',
      sender_name: 'Alex Rivera',
      sender_role: 'Safe Driver',
      content: 'Watch out near 4th & Main Street! Reported a pothole in the hazards map tab.',
      timestamp: '11:15 AM',
      reactions_count: 12
    },
    {
      id: 'msg_3',
      group_id: 'group_2',
      sender_name: 'Jean Dubois',
      sender_role: 'Eco Ambassador',
      content: 'Keeping braking jerk under 0.15 m/s³ saved ~8% fuel efficiency on my commute today!',
      timestamp: '09:30 AM',
      reactions_count: 5
    }
  ]);

  const [newMessageText, setNewMessageText] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const currentGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const groupMessages = messages.filter(m => m.group_id === selectedGroupId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const newMsg: GroupMessage = {
      id: `msg_${Date.now()}`,
      group_id: selectedGroupId,
      sender_name: userProfile.full_name,
      sender_role: 'Level 4 Ambassador',
      content: newMessageText.trim(),
      timestamp: 'Just now',
      reactions_count: 1
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessageText('');
  };

  const handleShareAchievementToGroup = () => {
    const shareMsg: GroupMessage = {
      id: `msg_achieve_${Date.now()}`,
      group_id: selectedGroupId,
      sender_name: userProfile.full_name,
      sender_role: 'Level 4 Ambassador',
      content: '🎉 Just hit 100 Miles Safe milestone with 98.5 Safety Score! Let’s keep our cohort top of the leaderboard!',
      timestamp: 'Just now',
      reactions_count: 3,
      achievement_share: {
        title: '100 Miles Safe',
        score: 98.5,
        badge: 'Platinum Guardian'
      }
    };
    setMessages(prev => [...prev, shareMsg]);
  };

  const handleToggleJoinGroup = (groupId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const nextJoined = !g.is_joined;
        return {
          ...g,
          is_joined: nextJoined,
          member_count: nextJoined ? g.member_count + 1 : g.member_count - 1
        };
      }
      return g;
    }));
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;

    const created: YouthGroup = {
      id: `group_${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      category: 'SAFETY_CLUB',
      member_count: 1,
      avg_group_score: 98.5,
      is_joined: true,
      avatar_color: '#2dd4bf'
    };

    setGroups(prev => [created, ...prev]);
    setSelectedGroupId(created.id);
    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
  };

  const handleReaction = (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions_count: m.reactions_count + 1 } : m));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="glass-card p-6 border border-[#2dd4bf]/20 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#2dd4bf]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[#2dd4bf]" />
              <h2 className="text-xl font-bold text-white font-display">Youth Driver Community & Safety Cohorts</h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Form driver groups, share driving safety achievements, and chat in real-time with fellow youth ambassadors.
            </p>
          </div>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 font-bold hover:shadow-lg transition-all cursor-pointer glow-mint shrink-0"
          >
            <Plus className="w-4 h-4 fill-slate-950" />
            <span>Form Youth Group</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Groups Directory & User Profile Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* User Profile Mini Badge */}
          <div className="glass-card p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-[#2dd4bf] flex items-center justify-center font-bold text-[#2dd4bf] text-lg">
                AR
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">{userProfile.full_name}</h3>
                <span className="text-xs text-[#2dd4bf] font-semibold">Level {userProfile.level} Safe Driver</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs bg-[#020617]/60 p-2.5 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Safety Score</span>
                <span className="font-mono font-bold text-[#2dd4bf]">{userProfile.safety_score}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Clean Trips</span>
                <span className="font-mono font-bold text-[#a78bfa]">{userProfile.clean_trips_count}</span>
              </div>
            </div>
          </div>

          {/* Youth Groups Directory */}
          <div className="glass-card p-5 space-y-4">
            <span className="card-title flex items-center gap-2 mb-0">
              <Globe className="w-4 h-4 text-[#2dd4bf]" /> Youth Driver Groups
            </span>

            <div className="space-y-3">
              {groups.map((group) => {
                const isSelected = group.id === selectedGroupId;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#020617]/90 border-[#2dd4bf]/40 shadow-md'
                        : 'bg-[#020617]/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: group.avatar_color }}
                          />
                          {group.name}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-2 leading-snug">{group.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
                      <span>{group.member_count} Members • Avg {group.avg_group_score} Score</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleJoinGroup(group.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          group.is_joined
                            ? 'bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {group.is_joined ? 'Joined ✓' : '+ Join Group'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Group Messaging & Chat Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-6 flex flex-col h-[600px]">
            
            {/* Group Header */}
            <div className="pb-4 border-b border-white/10 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentGroup.avatar_color }}
                  />
                  {currentGroup.name}
                </h3>
                <p className="text-xs text-slate-400">{currentGroup.member_count} Youth Members Active</p>
              </div>

              <button
                onClick={handleShareAchievementToGroup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a78bfa]/20 border border-[#a78bfa]/40 text-xs font-bold text-[#a78bfa] hover:bg-[#a78bfa]/30 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#a78bfa]" />
                <span>Share Achievement to Group</span>
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {groupMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No messages in this group yet. Be the first to start the conversation!
                </div>
              ) : (
                groupMessages.map((msg) => (
                  <div key={msg.id} className="bg-[#020617]/70 p-4 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{msg.sender_name}</span>
                        <span className="text-[10px] font-semibold text-[#2dd4bf] bg-[#2dd4bf]/10 px-2 py-0.5 rounded-full border border-[#2dd4bf]/20">
                          {msg.sender_role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans">{msg.content}</p>

                    {/* Shared Achievement Card inside message */}
                    {msg.achievement_share && (
                      <div className="p-3 rounded-lg bg-gradient-to-r from-[#2dd4bf]/10 to-[#a78bfa]/10 border border-[#2dd4bf]/30 flex items-center gap-3 my-2">
                        <div className="w-9 h-9 rounded-lg bg-[#2dd4bf]/20 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5 text-[#2dd4bf]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{msg.achievement_share.title}</div>
                          <div className="text-[10px] text-slate-300">
                            Safety Score: <strong className="text-[#2dd4bf]">{msg.achievement_share.score}</strong> • Badge: {msg.achievement_share.badge}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                      <button
                        onClick={() => handleReaction(msg.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>{msg.reactions_count} Safe Drive High-Fives</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send Message Input Form */}
            <form onSubmit={handleSendMessage} className="pt-4 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder={`Message ${currentGroup.name}...`}
                className="flex-1 bg-[#020617] border border-white/10 focus:border-[#2dd4bf] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#2dd4bf] text-slate-950 font-bold hover:bg-[#2dd4bf]/90 transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0"
              >
                <Send className="w-4 h-4 fill-slate-950" />
                <span>Post</span>
              </button>
            </form>

          </div>
        </div>

      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full space-y-4 border border-[#2dd4bf]/30">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <UserPlus className="w-5 h-5 text-[#2dd4bf]" /> Form Youth Driver Group
            </h3>
            <p className="text-xs text-slate-300">
              Create a group for your high school, college campus, or neighborhood safety squad.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Bay Area Youth Eco Squad"
                  className="w-full bg-[#020617] border border-white/10 focus:border-[#2dd4bf] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Group Description</label>
                <textarea
                  required
                  rows={3}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Describe your group's safety goals or meeting habits..."
                  className="w-full bg-[#020617] border border-white/10 focus:border-[#2dd4bf] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#2dd4bf] to-[#a78bfa] text-slate-950 text-xs font-bold cursor-pointer glow-mint"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
