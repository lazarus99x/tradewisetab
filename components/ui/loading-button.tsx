import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
}

export function LoadingButton({
  loading,
  children,
  className,
  disabled,
  variant,
  size,
  ...props
}: LoadingButtonProps) {
  return (
    <Button 
      className={cn(className)} 
      disabled={disabled || loading} 
      variant={variant}
      size={size}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}
