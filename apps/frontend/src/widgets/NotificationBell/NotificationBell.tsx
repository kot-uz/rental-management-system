import React, { useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
} from "@mui/material";
import { Notifications } from "@mui/icons-material";
import {
  useGetUnreadCountQuery,
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from "../../entities/notifications/api/notificationsApi";
import { formatDate } from "../../shared/utils/formatMoney";

export function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { data: countData } = useGetUnreadCountQuery();
  const { data: notifs, refetch } = useGetNotificationsQuery({
    unreadOnly: false,
  });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const count = typeof countData?.data === "number" ? countData.data : 0;
  const notifications = notifs?.data ?? [];

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    void refetch();
  };

  const handleMarkAll = async () => {
    await markAllRead();
  };

  return (
    <>
      <IconButton onClick={handleOpen}>
        <Badge badgeContent={count} color="error">
          <Notifications />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ width: 360, maxHeight: 500 }}>
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontSize={16}>
              Notifications
            </Typography>
            {count > 0 && (
              <Button size="small" onClick={handleMarkAll}>
                Mark all read
              </Button>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary" variant="body2">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ overflow: "auto", maxHeight: 400, px: 1 }}>
              {notifications.slice(0, 20).map((n) => (
                <ListItem
                  key={n.id}
                  sx={{
                    border: n.isRead ? "none" : "1px solid #4caf50",
                    cursor: "pointer",
                    borderRadius: 1,
                    mb: 1,
                  }}
                  onClick={() => void markRead(n.id)}
                >
                  <ListItemText
                    primary={n.title}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {n.body}
                        </Typography>
                        <br />
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.disabled"
                        >
                          {formatDate(n.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
