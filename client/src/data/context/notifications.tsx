import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import sx from "./notifications.module.css";
import { IoCloseOutline } from "react-icons/io5";

export interface INotification {
  id: string;
  body: ReactNode;
  type?: string;
  timeout?: number;
}

type INotificationBody = Omit<INotification, "id">;

interface INotificationsContext {
  notifications: INotification[];
  showNotification: (notif: INotificationBody) => void;
  removeNotification: (id: string) => void;
}

const NotificationsContext = createContext<INotificationsContext>({
  notifications: [],
  showNotification: () => {},
  removeNotification: () => {},
});

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  const showNotification = useCallback((notif: INotificationBody) => {
    const id = Date.now().toString() + (Math.random() * 10000).toFixed(0);
    let timeout: number | undefined;
    if (notif.timeout) {
      timeout = setTimeout(() => {
        document
          .querySelector(`[data-notif-id="${id}"]`)
          ?.classList.add(sx.hiding);
        setTimeout(() => {
          setNotifications((arr) => arr.filter((n) => n.id !== id));
        }, 200);
      }, notif.timeout - 200);
    }
    setNotifications((arr) => [
      ...arr,
      {
        ...notif,
        id,
        timeout,
      },
    ]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((arr) => arr.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, showNotification, removeNotification }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const { showNotification } = useContext(NotificationsContext);
  return { showNotification };
}

export function NotificationsHost() {
  const { notifications, removeNotification } =
    useContext(NotificationsContext);

  return (
    <>
      {notifications.map((n) => (
        <div
          key={n.id}
          data-notif-id={n.id}
          className={`${sx.notification} ${n.type ? sx[n.type] : ""}`}
        >
          {n.body}
          <button className={sx.close} onClick={() => removeNotification(n.id)}>
            <IoCloseOutline />
          </button>
        </div>
      ))}
    </>
  );
}
