export { cn } from "./lib/utils.js";

export {
  DashboardSkeleton,
  EmptyState,
  PageHeader,
  type PageHeaderProps,
  PreviewBanner,
  Section,
  SegmentedControl,
  StatCard,
  ToggleChip
} from "./components/layout.js";

export { Button, buttonVariants } from "./components/ui/button.js";
export type { ButtonProps } from "./components/ui/button.js";

export { Input } from "./components/ui/input.js";
export { PasswordInput } from "./components/ui/password-input.js";
export { Label } from "./components/ui/label.js";
export { Skeleton, SkeletonText } from "./components/ui/skeleton.js";

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from "./components/ui/popover.js";

export { DateRangePicker, type DateRangePickerProps } from "./components/ui/date-range-picker.js";
export { WeekDatePicker, type WeekDatePickerProps } from "./components/ui/week-date-picker.js";
export { DatePicker, type DatePickerProps } from "./components/ui/date-picker.js";

export {
  addMonths,
  buildMonthGrid,
  compareDateKeys,
  dateFromKey,
  dateKeyFromDate,
  formatDateKeyLabel,
  formatDateRangeLabel,
  isDateKeyInRange,
  isSameMonthKey,
  normalizeDateRange,
  parseDateKey,
  toDateKey,
  weekBoundsForDateKey
} from "./lib/date-keys.js";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent
} from "./components/ui/card.js";

export { Badge, badgeVariants } from "./components/ui/badge.js";

export {
  TimesheetApprovalStatusBadge,
  type TimesheetApprovalStatus
} from "./components/timesheet-approval-status-badge.js";
export {
  SubmitCascadeDialog,
  type SubmitCascadeDialogProps
} from "./components/submit-cascade-dialog.js";
export {
  AmendmentRequestDialog,
  type AmendmentRequestDialogProps
} from "./components/amendment-request-dialog.js";
export { formatSubmissionPeriodLabel } from "./components/submission-period-label.js";

export {
  DashboardStatCard,
  type DashboardStatCardProps,
  type DashboardStatTone
} from "./components/dashboard-stat-card.js";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption
} from "./components/ui/table.js";

export {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  TablePagination,
  TableToolbar,
  type TablePaginationProps,
  type TableToolbarProps,
  dataTableCardClass,
  dataTableCellClass,
  dataTableHeadClass,
  dataTableHeaderRowClass
} from "./components/data-table/data-table.js";

export { TableLoadingRows, TableLoadingState } from "./components/data-table/table-loading.js";

export {
  Spinner,
  CenteredLoader,
  LoadingCrossfade,
  type SpinnerSize
} from "./components/ui/spinner.js";

export {
  MotionReveal,
  StaggerList,
  StaggerItem,
  CrossfadePresence,
  DismissableList,
  type MotionRevealProps,
  type StaggerListProps,
  type StaggerItemProps,
  type CrossfadePresenceProps,
  type DismissableListProps
} from "./components/motion/index.js";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem
} from "./components/ui/select.js";

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "./components/ui/command.js";

export {
  SearchableSelect,
  type SearchableSelectGroup,
  type SearchableSelectOption,
  type SearchableSelectProps
} from "./components/ui/searchable-select.js";

export {
  SearchableMultiSelect,
  type SearchableMultiSelectOption,
  type SearchableMultiSelectProps
} from "./components/ui/searchable-multi-select.js";

export {
  filterOptionsByQuery,
  getOptionSearchText,
  type FilterableOption
} from "./lib/filter-options.js";

export {
  ProjectColorDot,
  ProjectColorEditor,
  ProjectColorPicker,
  ProjectNameWithColor
} from "./components/project-color.js";

export {
  AssigneeAvatarStack,
  type AssigneeAvatarMember,
  type AssigneeAvatarStackProps
} from "./components/assignee-avatar-stack.js";

export {
  TaskAssigneePicker,
  type TaskAssigneeOption,
  type TaskAssigneePickerProps
} from "./components/task-assignee-picker.js";

export {
  MemberProjectColorPicker,
  type MemberProjectColorPickerProps
} from "./components/member-project-color-picker.js";

export {
  TimeEntryAuditTrail,
  TimeEntryAuditEventList,
  type TimeEntryAuditEvent
} from "./components/time-entry-audit-trail.js";

export {
  ConfirmDialog,
  type ConfirmDialogProps,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from "./components/ui/confirm-dialog.js";

export {
  ConfirmNoteDialog,
  type ConfirmNoteDialogProps
} from "./components/ui/confirm-note-dialog.js";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "./components/ui/dialog.js";

export { AppModal, type AppModalProps } from "./components/ui/app-modal.js";

export {
  modalIconWrapVariants,
  type ModalSize,
  type ModalTone
} from "./components/ui/modal-styles.js";

export {
  ResponsiveLayoutShell,
  type SidebarNavItem,
  type ResponsiveLayoutShellProps
} from "./components/layout-shell.js";

export {
  SpotlightTour,
  type SpotlightTourProps,
  type SpotlightTourStep
} from "./components/spotlight-tour.js";

export {
  ShellToolbarProvider,
  useShellToolbar,
  isShellToolbarParts,
  resolveShellToolbar,
  type ShellToolbarParts,
  type ShellToolbarValue
} from "./components/shell-toolbar-context.js";

export {
  AppBar,
  type AppBarProps,
  AppBarListToolbar,
  type AppBarListToolbarProps,
  appBarListFilterTriggerClass,
  AppBarSecondary,
  type AppBarSecondaryProps,
  AppBarActionButton,
  type AppBarActionButtonProps,
  AppBarIconButton,
  appBarIconButtonClass,
  type AppBarIconButtonProps,
  AppBarToolbar,
  ShellMenuItem,
  ShellMenuPanel,
  ShellMenuRadioItem,
  SidebarUserFooter,
  type SidebarUserFooterProps,
  UserAvatar,
  type UserAvatarProps,
  WidgetShell,
  type WidgetShellProps,
  appBarActionButtonVariants,
  appBarIconButtonVariants,
  appBarIconSizeClass,
  appBarToolbarClass,
  appBarToolbarSeparatorClass,
  shellInsetXClass,
  shellHeaderBandYClass,
  shellMainContentClass,
  getUserInitials,
  getDisplayInitials,
  shellAppBarClass,
  shellAppBarDescriptionClass,
  shellAppBarPrimaryRowClass,
  shellAppBarSecondaryRowClass,
  shellAppBarTitleClass,
  shellMainClass,
  shellMenuItemVariants,
  shellMenuPanelClass,
  shellMobileDrawerClass,
  shellMobileHeaderClass,
  shellSidebarClass,
  shellSidebarFooterClass,
  shellSidebarScrollClass,
  sidebarCollapsedLogoutButtonClass,
  sidebarLogoutButtonClass,
  sidebarProfileLinkClass,
  userAvatarVariants,
  widgetShellTitleClass,
  widgetShellVariants,
  widgetShellViewToolbarClass
} from "./components/shell/index.js";
