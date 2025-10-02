/**
 * Alumni Member Card Usage Examples
 * 
 * This file demonstrates different ways to use the AlumniMemberCard component
 */

import AlumniMemberCard from '@/components/alumni/AlumniMemberCard'

// Example 1: Default variant with all fields
const exampleMember1 = {
    id: '1',
    name: 'TEST USER',
    role: 'PRESIDENT',
    now: 'Senior Software Engineer at Google',
    bio: 'Led the club to win multiple ICPC regionals and mentored over 50 students in competitive programming.',
    image_url: '/alumni/test.jpg',
    linkedin_url: 'https://linkedin.com/in/test,
  github_url: 'https://github.com/test',
    cf_handle: 'test_user',
    highlight: true
}

export function DefaultVariant() {
    return (
        <div className="max-w-md">
            <AlumniMemberCard member={exampleMember1} variant="default" />
        </div>
    )
}

// Example 2: Compact variant for grid layouts
const exampleMember2 = {
    id: '2',
    name: 'Jane Smith',
    role: 'VICE PRESIDENT',
    now: 'ML Engineer at Meta',
    image_url: '/alumni/jane-smith.jpg',
    linkedin_url: 'https://linkedin.com/in/janesmith',
    github_url: 'https://github.com/janesmith',
    highlight: false
}

export function CompactVariant() {
    return (
        <div className="max-w-xs">
            <AlumniMemberCard member={exampleMember2} variant="compact" />
        </div>
    )
}

// Example 3: Detailed variant with bio
const exampleMember3 = {
    id: '3',
    name: 'Alex Johnson',
    role: 'GENERAL SECRETARY',
    now: 'Founding Engineer at Startup XYZ',
    bio: 'Organized 20+ workshops on algorithms and data structures. Won gold medal in ICPC Asia West Finals 2023.',
    image_url: '/alumni/alex-johnson.jpg',
    linkedin_url: 'https://linkedin.com/in/alexjohnson',
    github_url: 'https://github.com/alexjohnson',
    cf_handle: 'alex_coder',
    highlight: false
}

export function DetailedVariant() {
    return (
        <div className="max-w-md">
            <AlumniMemberCard member={exampleMember3} variant="detailed" />
        </div>
    )
}

// Example 4: Grid layout with multiple cards
export function GridLayout() {
    const members = [exampleMember1, exampleMember2, exampleMember3]

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
            {members.map(member => (
                <AlumniMemberCard
                    key={member.id}
                    member={member}
                    variant="default"
                />
            ))}
        </div>
    )
}

// Example 5: With search highlighting
export function WithSearchHighlight() {
    const searchQuery = 'software'

    return (
        <div className="max-w-md">
            <AlumniMemberCard
                member={exampleMember1}
                query={searchQuery}
                variant="default"
            />
        </div>
    )
}

// Example 6: Minimal member (no image, no links)
const minimalMember = {
    id: '4',
    name: 'Sarah Williams',
    role: 'MEMBER',
    now: 'PhD Student at MIT',
    highlight: false
}

export function MinimalCard() {
    return (
        <div className="max-w-md">
            <AlumniMemberCard member={minimalMember} variant="default" />
        </div>
    )
}

// Example 7: List layout with compact cards
export function ListLayout() {
    const members = [exampleMember1, exampleMember2, exampleMember3, minimalMember]

    return (
        <div className="space-y-3 max-w-2xl">
            {members.map(member => (
                <AlumniMemberCard
                    key={member.id}
                    member={member}
                    variant="compact"
                />
            ))}
        </div>
    )
}
