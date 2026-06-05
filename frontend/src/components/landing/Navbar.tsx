import Link from "next/link";

/**
 * LANDING: Navbar component
 */
export function Navbar() {
  return (
    <header className="flex justify-between items-center px-6 md:px-12 lg:px-16 py-5 w-full">
      <Link href="/" className="block">
        <img
          src="/logo-with-title.svg"
          alt="Schedule Helper Logo"
          className="h-8 w-auto object-contain"
        />
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/auth/login"
          className="text-[15px] font-medium text-[#0A0A0A] hover:text-[#8A38F5] transition-colors"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="bg-[#B597FF] hover:opacity-90 transition-opacity text-white text-[15px] font-medium px-5 py-2.5 rounded-lg shadow-sm"
        >
          Sign Up
        </Link>
      </div>
    </header>
  );
}
