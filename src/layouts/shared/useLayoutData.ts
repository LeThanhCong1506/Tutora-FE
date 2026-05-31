import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getUnreadCount } from '../../services/notification.service';
import { signalRService } from '../../services/signalr.service';
import { getUserInfoFromToken } from '../../services/auth.service';
import { getNextLesson } from '../../services/lesson.service';
import type { LessonResponse } from '../../services/lesson.service';

// Helper function to get initials from name
export const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export interface UserData {
    name: string;
    initials: string;
    role: string;
}

/**
 * Hook to load user data from JWT token
 */
export function useUserData() {
    const [userData, setUserData] = useState<UserData>({
        name: 'User',
        initials: 'U',
        role: 'PARENT',
    });

    useEffect(() => {
        const user = getUserInfoFromToken();
        if (user) {
            const displayName = user.fullname ||
                (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
                user.email?.split('@')[0] ||
                'User';
            const initials = getInitials(displayName);
            setUserData({
                name: displayName,
                initials,
                role: user.role || 'PARENT',
            });
        }
    }, []);

    return userData;
}

/**
 * Hook to manage notification state + SignalR real-time updates
 */
export function useNotifications() {
    const [notificationCount, setNotificationCount] = useState(0);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

    useEffect(() => {
        const fetchNotificationCount = async () => {
            try {
                const count = await getUnreadCount();
                setNotificationCount(count);
            } catch (error) {
                console.error('Failed to fetch notification count:', error);
            }
        };

        fetchNotificationCount();

        // Listen for explicit count updates from backend
        const handleNotificationCountUpdate = (count: number) => {
            setNotificationCount(count);
        };

        // Listen for new real-time notifications and auto-increment badge
        const handleNewNotification = (notification: any) => {
            // Check if notification is for current user (backend may broadcast to all)
            const user = getUserInfoFromToken();
            const currentUserId = user?.userId || user?.sub;
            if (notification.userid && currentUserId && notification.userid !== currentUserId) {
                return;
            }
            setNotificationCount(prev => prev + 1);
        };

        signalRService.onNotificationCountUpdated(handleNotificationCountUpdate);
        signalRService.onNotificationReceived(handleNewNotification);

        // Ensure notification hub is connected regardless of whether chat page has been visited
        signalRService.connect().catch(() => {/* handled internally */});

        return () => {
            signalRService.offNotificationCountUpdated();
            signalRService.offNotificationReceived();
        };
    }, []);

    const handleRefreshNotificationCount = useCallback(async () => {
        try {
            const count = await getUnreadCount();
            setNotificationCount(count);
        } catch (error) {
            console.error('Failed to refresh notification count:', error);
        }
    }, []);

    return {
        notificationCount,
        showNotificationDropdown,
        setShowNotificationDropdown,
        handleRefreshNotificationCount,
    };
}

/**
 * Hook to manage sidebar open/close state + scroll lock + route-change close
 */
export function useSidebarState() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Handle scroll lock when sidebar open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    return { sidebarOpen, setSidebarOpen };
}

/**
 * Hook to load next lesson data
 */
export function useNextLesson() {
    const [nextLesson, setNextLesson] = useState<LessonResponse | null>(null);

    const loadNextLesson = useCallback(async () => {
        try {
            const lesson = await getNextLesson();
            if (lesson) {
                setNextLesson(lesson);
            }
        } catch (error) {
            console.error('❌ Error loading next lesson:', error);
        }
    }, []);

    return { nextLesson, loadNextLesson };
}
