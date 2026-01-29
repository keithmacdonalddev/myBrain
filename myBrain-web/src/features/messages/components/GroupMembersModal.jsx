import { useState } from 'react';
import { X, UserPlus, UserMinus, Crown, Search, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import BaseModal from '../../../components/ui/BaseModal';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useAddMember, useRemoveMember, useUpdateMemberRole } from '../hooks/useMessages';
import { useConnections } from '../../social/hooks/useConnections';
import useToast from '../../../hooks/useToast';

function GroupMembersModal({ conversation, onClose }) {
  const { user: currentUser } = useSelector((state) => state.auth);
  const toast = useToast();
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();
  const { data: connectionsData } = useConnections();

  // Get current user's role
  const currentUserMeta = conversation.participantMeta?.find(
    m => m.userId === currentUser?._id
  );
  const isAdmin = currentUserMeta?.role === 'admin';

  // Get participant info with roles
  const members = conversation.participants?.map(p => {
    const meta = conversation.participantMeta?.find(m => m.userId === p._id);
    return {
      ...p,
      role: meta?.role || 'member',
      joinedAt: meta?.joinedAt
    };
  }) || [];

  // Get connections not in the group (for adding)
  const connections = connectionsData?.connections || [];
  const availableToAdd = connections
    .filter(c => c.status === 'accepted')
    .map(c => c.user)
    .filter(u => !members.some(m => m._id === u._id))
    .filter(u => !searchQuery ||
      u.profile?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleAddMember = async (userId) => {
    try {
      await addMember.mutateAsync({ conversationId: conversation._id, userId });
      toast.success('Member added');
      setSearchQuery('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    const isSelf = userId === currentUser?._id;
    try {
      await removeMember.mutateAsync({ conversationId: conversation._id, userId });
      toast.success(isSelf ? 'You left the group' : 'Member removed');
      if (isSelf) onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleToggleAdmin = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateMemberRole.mutateAsync({ conversationId: conversation._id, userId, role: newRole });
      toast.success(newRole === 'admin' ? 'Made admin' : 'Removed admin role');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  return (
    <BaseModal onClose={onClose} title="Group Members" size="sm">
      <div className="space-y-4">
        {/* Members list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text">Members ({members.length})</h3>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Add
              </button>
            )}
          </div>

          {/* Add member search */}
          {showAddMember && (
            <div className="space-y-2 p-3 bg-bg rounded-lg border border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connections..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-panel border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-muted text-center py-2">No connections to add</p>
                ) : (
                  availableToAdd.map(user => (
                    <button
                      key={user._id}
                      onClick={() => handleAddMember(user._id)}
                      disabled={addMember.isPending}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-panel rounded transition-colors"
                    >
                      <UserAvatar user={user} size="sm" />
                      <span className="flex-1 text-sm text-text text-left truncate">
                        {user.profile?.displayName || user.email}
                      </span>
                      {addMember.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Members */}
          <div className="space-y-1">
            {members.map(member => (
              <div
                key={member._id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg transition-colors"
              >
                <UserAvatar user={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text truncate">
                      {member.profile?.displayName || member.email}
                    </span>
                    {member.role === 'admin' && (
                      <Crown className="w-3 h-3 text-amber-500" />
                    )}
                    {member._id === currentUser?._id && (
                      <span className="text-xs text-muted">(you)</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isAdmin && member._id !== currentUser?._id && (
                    <>
                      <button
                        onClick={() => handleToggleAdmin(member._id, member.role)}
                        disabled={updateMemberRole.isPending}
                        className={`p-1 rounded transition-colors ${
                          member.role === 'admin'
                            ? 'text-amber-500 hover:bg-amber-500/10'
                            : 'text-muted hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={removeMember.isPending}
                        className="p-1 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove from group"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {member._id === currentUser?._id && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={removeMember.isPending}
                      className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      Leave
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

export default GroupMembersModal;
