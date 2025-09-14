declare module '@ant-design/icons' {
  import { ComponentType } from 'react';

  export interface AntdIconProps {
    className?: string;
    style?: React.CSSProperties;
    spin?: boolean;
    rotate?: number;
    twoToneColor?: string;
    onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  }

  export type AntdIcon = ComponentType<AntdIconProps>;

  // Common Ant Design icons
  export const CheckCircleOutlined: AntdIcon;
  export const CloseCircleOutlined: AntdIcon;
  export const ExclamationCircleOutlined: AntdIcon;
  export const InfoCircleOutlined: AntdIcon;
  export const QuestionCircleOutlined: AntdIcon;
  export const WarningOutlined: AntdIcon;
  export const PlusOutlined: AntdIcon;
  export const MinusOutlined: AntdIcon;
  export const EditOutlined: AntdIcon;
  export const DeleteOutlined: AntdIcon;
  export const SearchOutlined: AntdIcon;
  export const FilterOutlined: AntdIcon;
  export const DownloadOutlined: AntdIcon;
  export const UploadOutlined: AntdIcon;
  export const EyeOutlined: AntdIcon;
  export const EyeInvisibleOutlined: AntdIcon;
  export const LockOutlined: AntdIcon;
  export const UnlockOutlined: AntdIcon;
  export const UserOutlined: AntdIcon;
  export const TeamOutlined: AntdIcon;
  export const SettingOutlined: AntdIcon;
  export const HomeOutlined: AntdIcon;
  export const MenuOutlined: AntdIcon;
  export const MoreOutlined: AntdIcon;
  export const LoadingOutlined: AntdIcon;
  export const ReloadOutlined: AntdIcon;
  export const SaveOutlined: AntdIcon;
  export const PrinterOutlined: AntdIcon;
  export const ShareAltOutlined: AntdIcon;
  export const CopyOutlined: AntdIcon;
  export const FileTextOutlined: AntdIcon;
  export const FolderOutlined: AntdIcon;
  export const CalendarOutlined: AntdIcon;
  export const ClockCircleOutlined: AntdIcon;
  export const BellOutlined: AntdIcon;
  export const MailOutlined: AntdIcon;
  export const PhoneOutlined: AntdIcon;
  export const GlobalOutlined: AntdIcon;
  export const LinkOutlined: AntdIcon;
  export const HeartOutlined: AntdIcon;
  export const StarOutlined: AntdIcon;
  export const LikeOutlined: AntdIcon;
  export const DislikeOutlined: AntdIcon;
  export const CodeOutlined: AntdIcon;
  export const PlayCircleOutlined: AntdIcon;
  export const HistoryOutlined: AntdIcon;
  export const SyncOutlined: AntdIcon;
  export const MonitorOutlined: AntdIcon;
  export const InboxOutlined: AntdIcon;
  export const ExperimentOutlined: AntdIcon;
  export const PauseCircleOutlined: AntdIcon;
  export const BarChartOutlined: AntdIcon;
  export const TrophyOutlined: AntdIcon;
  export const LineChartOutlined: AntdIcon;
  export const SecurityScanOutlined: AntdIcon;
  export const CloudServerOutlined: AntdIcon;
  export const MedicineBoxOutlined: AntdIcon;
  export const SafetyCertificateOutlined: AntdIcon;
  export const CheckOutlined: AntdIcon;
  export const CloseOutlined: AntdIcon;

  // Add any other icons as needed
  const antdIcons: {
    [key: string]: AntdIcon;
  };

  export default antdIcons;
}
