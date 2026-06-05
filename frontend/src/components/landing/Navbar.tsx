import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="flex justify-between items-center px-6 md:px-12 lg:px-16 py-5 w-full">
      <div className="p-3">
        <Link href="/" className="block w-full">
          <div className="w-full h-10 relative">
            <Image
              src="/logo-with-title.svg"
              alt="logo with title"
              width={200}
              height={40}
              className="object-contain"
              sizes="(max-width: 640px) 120px, 160px"
            />
          </div>
        </Link>
      </div>
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
