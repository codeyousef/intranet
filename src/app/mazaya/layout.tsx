import { MazayaLayoutClient } from '@/components/mazaya-layout-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mazaya Offers',
  description: 'Employee offers and discounts',
};

export default function MazayaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MazayaLayoutClient>{children}</MazayaLayoutClient>;
}
