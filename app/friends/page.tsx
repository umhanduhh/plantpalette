'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, FriendWithProgress, Friendship, getWeekDates } from '@/lib/types';

const REACTION_EMOJIS = ['🍎', '🥕', '🥦', '🍇', '🍓', '🍊', '🥬', '🍅', '🫐', '🥑'];

export default function FriendsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendWithProgress[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { requester_email: string })[]>([]);
  const [sentRequests, setSentRequests] = useState<(Friendship & { friend_email: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [error, setError] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const weekDates = getWeekDates();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        window.location.href = '/';
        return;
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUser(userData);
      }

      await Promise.all([
        loadFriends(authUser.id),
        loadPendingRequests(authUser.id),
        loadSentRequests(authUser.id)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFriends(userId: string) {
    // Get accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (!friendships) return;

    // Get friend IDs
    const friendIds = friendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    // Get friend details
    const { data: friendUsers } = await supabase
      .from('users')
      .select('id, email, username, first_name, weekly_goal')
      .in('id', friendIds);

    if (!friendUsers) return;

    // Get food counts for this week for each friend
    const friendsWithProgress: FriendWithProgress[] = await Promise.all(
      friendUsers.map(async (friend) => {
        const { data: logs } = await supabase
          .from('food_logs')
          .select('fdc_id')
          .eq('user_id', friend.id)
          .gte('logged_date', weekDates.week_starting_date)
          .lte('logged_date', weekDates.week_ending_date);

        const uniqueFoods = new Set(logs?.map(log => log.fdc_id) || []);

        // Get existing reaction from current user
        const { data: reaction } = await supabase
          .from('weekly_reactions')
          .select('*')
          .eq('from_user_id', userId)
          .eq('to_user_id', friend.id)
          .eq('week_starting_date', weekDates.week_starting_date)
          .maybeSingle();

        return {
          id: friend.id,
          email: friend.email,
          username: friend.username,
          first_name: friend.first_name,
          weekly_goal: friend.weekly_goal,
          foods_count: uniqueFoods.size,
          reaction: reaction || undefined
        };
      })
    );

    setFriends(friendsWithProgress);
  }

  async function loadPendingRequests(userId: string) {
    const { data: requests } = await supabase
      .from('friendships')
      .select('*, requester:user_id(email)')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (requests) {
      setPendingRequests(requests.map(r => ({
        ...r,
        requester_email: (r.requester as any).email
      })));
    }
  }

  async function loadSentRequests(userId: string) {
    const { data: requests } = await supabase
      .from('friendships')
      .select('*, friend:friend_id(email)')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (requests) {
      setSentRequests(requests.map(r => ({
        ...r,
        friend_email: (r.friend as any).email
      })));
    }
  }

  async function handleAddFriend() {
    if (!user || !friendEmail.trim()) return;

    setAddingFriend(true);
    setError('');

    try {
      // Find user by email using the database function
      const { data: friendUser, error: findError } = await supabase
        .rpc('find_user_by_email', { email_address: friendEmail.trim().toLowerCase() });

      if (findError) throw findError;

      if (!friendUser || friendUser.length === 0) {
        setError('No user found with that email address');
        return;
      }

      const foundUser = friendUser[0];

      if (foundUser.user_id === user.id) {
        setError('You cannot add yourself as a friend');
        return;
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${foundUser.user_id}),and(user_id.eq.${foundUser.user_id},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          setError('Friend request already sent');
        } else if (existing.status === 'accepted') {
          setError('You are already friends');
        } else {
          setError('Previous request was rejected');
        }
        return;
      }

      // Create friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: foundUser.user_id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setFriendEmail('');
      await loadSentRequests(user.id);
    } catch (err: any) {
      setError(err.message || 'Failed to send friend request');
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleRespondToRequest(requestId: string, accept: boolean) {
    if (!user) return;

    const { error } = await supabase
      .from('friendships')
      .update({
        status: accept ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error responding to request:', error);
      return;
    }

    await Promise.all([
      loadPendingRequests(user.id),
      accept ? loadFriends(user.id) : Promise.resolve()
    ]);
  }

  async function handleReaction(friendId: string, emoji: string) {
    if (!user) return;

    // Check if reaction already exists
    const existingReaction = friends.find(f => f.id === friendId)?.reaction;

    if (existingReaction) {
      // Update existing reaction
      const { error } = await supabase
        .from('weekly_reactions')
        .update({ emoji })
        .eq('id', existingReaction.id);

      if (error) {
        console.error('Error updating reaction:', error);
        return;
      }
    } else {
      // Create new reaction
      const { error } = await supabase
        .from('weekly_reactions')
        .insert({
          from_user_id: user.id,
          to_user_id: friendId,
          week_starting_date: weekDates.week_starting_date,
          emoji
        });

      if (error) {
        console.error('Error adding reaction:', error);
        return;
      }
    }

    setShowReactionPicker(null);
    await loadFriends(user.id);
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg font-poppins text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 font-[family-name:var(--font-poppins)]">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-[family-name:var(--font-playfair)] font-bold" style={{ color: '#d4006f' }}>
            Friends
          </h1>
          <a
            href="/dashboard"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#4cc9f0' }}
          >
            ← Back to Dashboard
          </a>
        </header>

        {/* Add Friend */}
        <div className="mb-8 p-6 bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl shadow-sm">
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#d4006f' }}>
            Add a Friend
          </h2>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Friend's email address"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#d4006f] focus:outline-none transition-colors"
            />
            <button
              onClick={handleAddFriend}
              disabled={addingFriend || !friendEmail.trim()}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d4006f, #ff6b35)' }}
            >
              {addingFriend ? 'Sending...' : 'Send Request'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#ff6b35' }}>
              Friend Requests
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{request.requester_email}</p>
                    <p className="text-sm text-gray-500">Wants to be your friend</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondToRequest(request.id, true)}
                      className="px-4 py-2 rounded-lg font-semibold text-white"
                      style={{ backgroundColor: '#52b788' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondToRequest(request.id, false)}
                      className="px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#4cc9f0' }}>
              Pending Requests
            </h2>
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <div key={request.id} className="bg-gray-50 rounded-xl p-4">
                  <p className="font-semibold text-gray-900">{request.friend_email}</p>
                  <p className="text-sm text-gray-500">Request sent • Waiting for response</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-xl font-[family-name:var(--font-playfair)] font-bold mb-4" style={{ color: '#52b788' }}>
            Your Friends
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <p className="text-xl text-gray-500 mb-2">No friends yet</p>
              <p className="text-gray-400">Add friends to see their progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => {
                const progressPercent = Math.min((friend.foods_count / friend.weekly_goal) * 100, 100);

                return (
                  <div key={friend.id} className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {friend.first_name || friend.username || friend.email}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {friend.foods_count} / {friend.weekly_goal} foods this week
                        </p>
                      </div>
                      <div className="relative">
                        {friend.reaction ? (
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === friend.id ? null : friend.id)}
                            className="text-3xl hover:scale-110 transition-transform"
                          >
                            {friend.reaction.emoji}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowReactionPicker(friend.id)}
                            className="text-2xl text-gray-300 hover:text-gray-500 transition-colors"
                          >
                            +
                          </button>
                        )}

                        {/* Reaction Picker */}
                        {showReactionPicker === friend.id && (
                          <div className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl p-3 z-10 border-2 border-gray-100">
                            <div className="grid grid-cols-5 gap-2">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(friend.id, emoji)}
                                  className="text-2xl hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 ease-out rounded-full"
                        style={{
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, #52b788 0%, #4cc9f0 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
