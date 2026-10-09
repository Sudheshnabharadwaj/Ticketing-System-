import React, { useState } from 'react';

interface UserAvatarProps {
  name: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatar,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Initial letter
  const getInitial = (n: string) => {
    if (!n) return 'U';
    const trimmed = n.trim();
    return trimmed.charAt(0).toUpperCase();
  };

  const initial = getInitial(name);

  // Size classes mapping
  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
    xl: 'w-12 h-12 text-base font-bold',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Render photo if avatar exists and hasn't errored
  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 ${className}`}
      />
    );
  }

  // Fallback Letter Avatar
  return (
    <div
      className={`${sizeClass} rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
};
