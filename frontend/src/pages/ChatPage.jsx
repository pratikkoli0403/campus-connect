import socket from "../sockets/socket";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Hash,
  Loader2,
  Menu,
  MoreVertical,
  Paperclip,
  Pin,
  Search,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getGroupMembers, getGroups } from "../services/groupService.js";
import { getMessages } from "../services/messageService";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatMessageTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-[#5865f2]",
  "bg-[#3ba55c]",
  "bg-[#faa61a]",
  "bg-[#ed4245]",
  "bg-[#eb459e]",
  "bg-[#57f287]",
];

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const TYPING_THROTTLE_MS = 2000;
const TYPING_IDLE_MS = 2000;
const TYPING_STALE_MS = 5000;

function formatTypingLabel(names) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing…`;
}

function PresenceDot({ online, size = "sm", className = "" }) {
  const sizeClass =
    size === "lg" ? "h-3 w-3 border-[2.5px]" : "h-2.5 w-2.5 border-2";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass} border-[#2b2d31] ${
        online ? "bg-[#23a559]" : "bg-[#80848e]"
      } ${className}`}
      title={online ? "Online" : "Offline"}
      aria-hidden
    />
  );
}

function UserAvatar({ user, online, size = "md" }) {
  const box =
    size === "sm"
      ? "h-8 w-8 text-[10px]"
      : "h-9 w-9 text-xs sm:h-10 sm:w-10";
  const dot =
    size === "sm"
      ? "h-2.5 w-2.5 border-2"
      : "h-3 w-3 border-[2.5px]";

  return (
    <div
      className={`relative shrink-0 ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
      }`}
    >
      <div
        className={`flex ${box} items-center justify-center rounded-full font-semibold text-white ${avatarColor(user.id)}`}
        aria-hidden
      >
        {getInitials(user.name)}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-[#2b2d31] ${dot} ${
          online ? "bg-[#23a559]" : "bg-[#80848e]"
        }`}
        title={online ? "Online" : "Offline"}
        aria-hidden
      />
    </div>
  );
}

function MessageRow({ message, showHeader, isOwn, isSenderOnline }) {
  const { sender, content, createdAt } = message;
  const bubbleBase =
    "max-w-[min(92vw,28rem)] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[min(85%,28rem)] sm:px-3.5 sm:text-[15px] md:max-w-md";

  if (isOwn) {
    return (
      <div
        className={`group flex justify-end px-2 sm:px-4 ${
          showHeader ? "mt-3 first:mt-0" : "mt-1"
        }`}
      >
        <div className="flex min-w-0 flex-col items-end">
          {showHeader && (
            <div className="mb-1 flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-[#f2f3f5]">
                {sender.name}
              </span>
              <PresenceDot online={isSenderOnline} />
              <span className="text-xs text-[#949ba4]">
                {formatMessageTime(createdAt)}
              </span>
            </div>
          )}
          <div
            className={`${bubbleBase} rounded-br-md bg-[#5865f2] text-white`}
          >
            <p className="break-words">{content}</p>
          </div>
          {!showHeader && (
            <span className="mt-0.5 px-1 text-[10px] text-[#949ba4] opacity-0 transition-opacity group-hover:opacity-100">
              {formatMessageTime(createdAt)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex justify-start gap-2 px-2 sm:gap-3 sm:px-4 ${
        showHeader ? "mt-3 first:mt-0" : "mt-1"
      }`}
    >
      {showHeader ? (
        <div className="mt-0.5 shrink-0 max-sm:scale-90 max-sm:origin-top-left sm:scale-100">
          <UserAvatar user={sender} online={isSenderOnline} />
        </div>
      ) : (
        <div className="flex w-8 shrink-0 items-center justify-center sm:w-10">
          <span className="text-[10px] text-[#949ba4] opacity-0 transition-opacity group-hover:opacity-100">
            {formatMessageTime(createdAt)}
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-col items-start">
        {showHeader && (
          <div className="mb-1 flex items-center gap-2 px-0.5">
            <span className="text-sm font-semibold text-[#f2f3f5]">
              {sender.name}
            </span>
            <PresenceDot online={isSenderOnline} />
            <span className="text-xs text-[#949ba4]">
              {formatMessageTime(createdAt)}
            </span>
          </div>
        )}
        <div
          className={`${bubbleBase} rounded-bl-md border border-[#1e1f22]/40 bg-[#404249] text-[#dbdee1]`}
        >
          <p className="break-words">{content}</p>
        </div>
      </div>
    </div>
  );
}

function ChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [membersOpen, setMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(() => new Map());
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const lastTypingEmitRef = useRef(0);
  const stopTypingTimerRef = useRef(null);
  const typingExpiryTimersRef = useRef(new Map());

  const isUserOnline = useMemo(() => {
    return (userId) => onlineUserIds.has(Number(userId));
  }, [onlineUserIds]);

  const typingLabel = useMemo(() => {
    const names = [...typingUsers.values()];
    return formatTypingLabel(names);
  }, [typingUsers]);

  function clearTypingExpiry(key) {
    const timer = typingExpiryTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      typingExpiryTimersRef.current.delete(key);
    }
  }

  function clearAllTypingExpiry() {
    typingExpiryTimersRef.current.forEach((timer) => clearTimeout(timer));
    typingExpiryTimersRef.current.clear();
  }

  function emitStopTyping(groupId = selectedGroupId) {
    if (groupId == null || !user?.name) return;

    clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = null;
    lastTypingEmitRef.current = 0;

    socket.emit("stopTyping", {
      groupId,
      userId: user.id,
      userName: user.name,
    });
  }

  function emitTyping() {
    if (selectedGroupId == null || !user?.name) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) {
      return;
    }

    lastTypingEmitRef.current = now;
    socket.emit("typing", {
      groupId: selectedGroupId,
      userId: user.id,
      userName: user.name,
    });
  }

  function scheduleStopTyping() {
    clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(
      () => emitStopTyping(),
      TYPING_IDLE_MS
    );
  }

  function addTypingUser(key, userName) {
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.set(key, userName);
      return next;
    });

    clearTypingExpiry(key);
    typingExpiryTimersRef.current.set(
      key,
      setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        typingExpiryTimersRef.current.delete(key);
      }, TYPING_STALE_MS)
    );
  }

  function removeTypingUser(key) {
    clearTypingExpiry(key);
    setTypingUsers((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchGroups() {
      setGroupsLoading(true);
      setGroupsError("");
      try {
        const data = await getGroups();
        if (cancelled) return;

        const list = data.data ?? [];
        setGroups(list);
        setSelectedGroupId((prev) => {
          if (prev != null && list.some((g) => g.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setGroupsError(
            err.response?.data?.message ?? "Failed to load groups."
          );
          setGroups([]);
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    fetchGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.id == null) return;

    const register = () => {
      socket.emit("registerUser", { userId: user.id });
    };

    const onOnlineUsers = (ids) => {
      setOnlineUserIds(new Set((ids ?? []).map(Number)));
    };

    register();
    socket.on("connect", register);
    socket.on("onlineUsers", onOnlineUsers);

    return () => {
      socket.off("connect", register);
      socket.off("onlineUsers", onOnlineUsers);
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (selectedGroupId == null) {
        setMessages([]);
        return;
      }

      try {
        const data = await getMessages(selectedGroupId);
        if (!cancelled) setMessages(data ?? []);
      } catch {
        if (!cancelled) {
          console.error("Failed to load messages");
          setMessages([]);
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId == null) return;

    socket.emit("joinGroup", { groupId: selectedGroupId });

    const onReceiveMessage = (message) => {
      if (Number(message.groupId) !== Number(selectedGroupId)) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on("receiveMessage", onReceiveMessage);

    return () => {
      socket.off("receiveMessage", onReceiveMessage);
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId == null) {
      setTypingUsers(new Map());
      clearAllTypingExpiry();
      return;
    }

    const onUserTyping = ({ groupId, userId, userName }) => {
      if (Number(groupId) !== Number(selectedGroupId)) return;
      if (user?.id != null && userId != null && Number(userId) === Number(user.id)) {
        return;
      }

      const key = userId ?? userName;
      addTypingUser(key, userName);
    };

    const onUserStopTyping = ({ groupId, userId, userName }) => {
      if (Number(groupId) !== Number(selectedGroupId)) return;
      removeTypingUser(userId ?? userName);
    };

    socket.on("userTyping", onUserTyping);
    socket.on("userStopTyping", onUserStopTyping);

    return () => {
      socket.off("userTyping", onUserTyping);
      socket.off("userStopTyping", onUserStopTyping);
      emitStopTyping(selectedGroupId);
      setTypingUsers(new Map());
      clearAllTypingExpiry();
      clearTimeout(stopTypingTimerRef.current);
    };
  }, [selectedGroupId, user?.id, user?.name]);

  useEffect(() => {
    if (selectedGroupId == null) {
      setGroupMembers([]);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      setMembersLoading(true);
      try {
        const data = await getGroupMembers(selectedGroupId);
        if (!cancelled) setGroupMembers(data.data ?? []);
      } catch {
        if (!cancelled) setGroupMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }

    const isIncremental =
      messages.length > prevMessageCountRef.current &&
      prevMessageCountRef.current > 0;

    messagesEndRef.current?.scrollIntoView({
      behavior: isIncremental ? "smooth" : "auto",
      block: "end",
    });
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groupSearch, groups]);

  function sendMessage() {
    const content = newMessage.trim();
    if (!content || selectedGroupId == null) return;

    const storedUser = getStoredUser();
    if (!storedUser?.id) return;

    socket.emit("sendMessage", {
      content,
      senderId: storedUser.id,
      groupId: selectedGroupId,
    });

    emitStopTyping();
    setNewMessage("");
  }

  function handleSend(e) {
    e.preventDefault();
    sendMessage();
  }

  function handleInputKeyDown(e) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    sendMessage();
  }

  function handleMessageChange(e) {
    const value = e.target.value;
    setNewMessage(value);

    if (!selectedGroup || !user?.name) return;

    if (!value.trim()) {
      emitStopTyping();
      return;
    }

    emitTyping();
    scheduleStopTyping();
  }

  function selectGroup(id) {
    setSelectedGroupId(id);
    setSidebarOpen(false);
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => {
      setIsMobileLayout(media.matches);
      if (!media.matches) setSidebarOpen(false);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!sidebarOpen || !isMobile) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#313338] text-[#f2f3f5]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Groups sidebar — off-canvas on mobile, fixed column on md+ */}
      <aside
        id="groups-sidebar"
        aria-label="Groups"
        aria-hidden={isMobileLayout ? !sidebarOpen : false}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw,280px)] max-w-full flex-col border-r border-[#1e1f22]/80 bg-[#2b2d31] transition-transform duration-300 ease-out max-md:shadow-2xl md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#1e1f22]/60 px-4 shadow-sm">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            CampusConnect
          </h2>
          <button
            type="button"
            aria-label="Close groups"
            className="rounded-md p-1.5 text-[#b5bac1] transition-colors hover:bg-[#3f4147] hover:text-[#f2f3f5] md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#949ba4]" />
            <input
              type="search"
              placeholder="Search groups"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full rounded-md border border-transparent bg-[#1e1f22] py-2 pl-9 pr-3 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none transition-all duration-200 hover:bg-[#232428] focus:border-[#5865f2]/50 focus:ring-2 focus:ring-[#5865f2]/25"
            />
          </div>
        </div>

        <div className="px-3 pb-1">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
            Your groups
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {groupsLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#5865f2]" aria-hidden />
              <p className="text-sm text-[#949ba4]">Loading groups…</p>
            </div>
          ) : groupsError ? (
            <p
              role="alert"
              className="px-2 py-4 text-center text-sm text-[#f23f42]"
            >
              {groupsError}
            </p>
          ) : (
            <>
              {filteredGroups.map((group) => {
                const active = group.id === selectedGroupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => selectGroup(group.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[15px] transition-all duration-150 ${
                      active
                        ? "bg-[#404249] text-white shadow-sm ring-1 ring-[#5865f2]/20"
                        : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                    }`}
                  >
                    <Hash
                      className={`h-5 w-5 shrink-0 ${active ? "text-[#f2f3f5]" : "text-[#949ba4]"}`}
                    />
                    <span className="truncate font-medium">{group.name}</span>
                  </button>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-[#949ba4]">
                  {groups.length === 0
                    ? "No groups available yet."
                    : "No groups match your search."}
                </p>
              )}
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-[#1e1f22]/60 bg-[#232428] p-2">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            {user ? (
              <UserAvatar
                user={user}
                online={isUserOnline(user.id)}
                size="sm"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865f2] text-xs font-bold text-white">
                You
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name ?? "Student"}
              </p>
              <p className="truncate text-xs text-[#949ba4]">
                {user?.id != null && isUserOnline(user.id)
                  ? "Online"
                  : user?.rollNo ?? "Offline"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main chat — full width on mobile */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[#1e1f22]/50 bg-[#313338] px-2 shadow-sm sm:gap-2 sm:px-3 md:px-4">
          <button
            type="button"
            aria-label="Open groups menu"
            aria-expanded={sidebarOpen}
            aria-controls="groups-sidebar"
            className="-ml-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] active:bg-[#404249] md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Hash className="hidden h-6 w-6 shrink-0 text-[#949ba4] sm:block" />
          <div className="min-w-0 flex-1">
            {groupsLoading ? (
              <>
                <div className="h-4 w-32 animate-pulse rounded bg-[#404249]" />
                <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-[#404249]/70" />
              </>
            ) : selectedGroup ? (
              <>
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  {selectedGroup.name}
                </h1>
                <p className="truncate text-[11px] text-[#949ba4] sm:text-xs">
                  <span className="sm:hidden">
                    {selectedGroup.branch}
                  </span>
                  <span className="hidden sm:inline">
                    {selectedGroup.branch} · Year {selectedGroup.year}
                  </span>
                </p>
              </>
            ) : (
              <>
                <h1 className="truncate text-base font-semibold text-[#949ba4]">
                  Select a group
                </h1>
                <p className="truncate text-xs text-[#6d6f78]">
                  Choose a channel from the sidebar
                </p>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              aria-label="Members"
              aria-expanded={membersOpen}
              onClick={() => setMembersOpen((open) => !open)}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] sm:h-auto sm:w-auto sm:p-2 ${
                membersOpen
                  ? "bg-[#404249] text-[#f2f3f5]"
                  : "text-[#b5bac1]"
              }`}
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Pinned messages"
              className="hidden rounded-md p-2 text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] sm:block"
            >
              <Pin className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="hidden rounded-md p-2 text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] lg:block"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="More options"
              className="hidden h-10 w-10 items-center justify-center rounded-md text-[#b5bac1] transition-colors hover:bg-[#404249] hover:text-[#f2f3f5] max-sm:flex sm:p-2"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </header>

        {membersOpen && selectedGroup && (
          <div className="shrink-0 border-b border-[#1e1f22]/50 bg-[#2b2d31] px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div className="w-full md:mx-auto md:max-w-4xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#949ba4]">
                  Members — {groupMembers.length}
                </p>
                <p className="text-xs text-[#949ba4]">
                  {groupMembers.filter((m) => isUserOnline(m.id)).length} online
                </p>
              </div>
              {membersLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-[#949ba4]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading members…
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-sm text-[#949ba4]">No members in this group.</p>
              ) : (
                <ul className="flex max-h-36 flex-col gap-2 overflow-y-auto sm:max-h-32 sm:flex-row sm:flex-wrap">
                  {groupMembers.map((member) => {
                    const online = isUserOnline(member.id);
                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-2 rounded-md bg-[#313338] px-2.5 py-1.5 ring-1 ring-[#1e1f22]/60"
                      >
                        <UserAvatar user={member} online={online} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#f2f3f5]">
                            {member.name}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-[#949ba4]">
                            <PresenceDot online={online} />
                            {online ? "Online" : "Offline"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="w-full space-y-0.5 py-3 sm:py-4 md:mx-auto md:max-w-4xl">
            {groupsLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Loader2
                  className="mb-4 h-10 w-10 animate-spin text-[#5865f2]"
                  aria-hidden
                />
                <p className="text-sm text-[#949ba4]">Loading channel…</p>
              </div>
            ) : !selectedGroup ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#404249]">
                  <Hash className="h-8 w-8 text-[#949ba4]" />
                </div>
                <h2 className="text-xl font-bold text-[#f2f3f5]">
                  No group selected
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#b5bac1]">
                  Pick a group from the sidebar to start chatting.
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#404249]">
                  <Hash className="h-8 w-8 text-[#949ba4]" />
                </div>
                <h2 className="text-xl font-bold text-[#f2f3f5]">
                  Welcome to #{selectedGroup.name}
                </h2>
                <p className="mt-2 max-w-sm text-sm text-[#b5bac1]">
                  This is the start of the channel. Say hello to your classmates.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const prev = messages[index - 1];
                  const isOwn =
                    user?.id != null &&
                    Number(msg.sender.id) === Number(user.id);
                  const showHeader =
                    !prev || prev.sender.id !== msg.sender.id;
                  return (
                    <MessageRow
                      key={msg.id}
                      message={msg}
                      showHeader={showHeader}
                      isOwn={isOwn}
                      isSenderOnline={isUserOnline(msg.sender.id)}
                    />
                  );
                })}
                <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-3 sm:pb-4 md:px-4">
          {typingLabel && (
            <p
              className="mb-1.5 truncate px-1 text-xs italic text-[#949ba4] md:mx-auto md:max-w-4xl"
              role="status"
              aria-live="polite"
            >
              {typingLabel}
            </p>
          )}
          <form
            onSubmit={handleSend}
            className="flex w-full items-end gap-1.5 rounded-lg bg-[#383a40] px-2 py-1.5 shadow-inner ring-1 ring-[#1e1f22]/40 transition-shadow focus-within:ring-[#5865f2]/40 sm:gap-2 sm:px-3 sm:py-2 md:mx-auto md:max-w-4xl"
          >
            <button
              type="button"
              aria-label="Attach file"
              className="mb-0.5 hidden shrink-0 rounded-md p-2 text-[#b5bac1] transition-colors hover:text-[#f2f3f5] sm:block"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              type="text"
              placeholder={
                selectedGroup
                  ? `Message #${selectedGroup.name}`
                  : "Select a group"
              }
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleInputKeyDown}
              onBlur={() => emitStopTyping()}
              disabled={!selectedGroup || groupsLoading}
              className="min-h-[40px] min-w-0 flex-1 bg-transparent py-2 text-sm text-[#f2f3f5] placeholder:text-[#6d6f78] outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-[15px]"
            />

            <button
              type="button"
              aria-label="Emoji"
              className="mb-0.5 hidden shrink-0 rounded-md p-2 text-[#b5bac1] transition-colors hover:text-[#f2f3f5] md:block"
            >
              <Smile className="h-5 w-5" />
            </button>

            <button
              type="submit"
              disabled={!newMessage.trim() || !selectedGroup || groupsLoading}
              aria-label="Send message"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#5865f2] text-white transition-all duration-200 hover:bg-[#4752c4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#5865f2] sm:h-auto sm:w-auto sm:p-2"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
