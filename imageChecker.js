let teams = [
	{
		abbr: 'ARS',
		names: ['Arsenal', 'Arsenal FC']
	},
	{
		abbr: 'BHA',
		names: ['Brighton', 'Brighton & Hove Albion',  'Brighton & Hove Albion FC']
	},
	{
		abbr: 'BOU',
		names: ['Bournemouth', 'AFC Bournemouth']
	},
	{
		abbr: 'BUR',
		names: ['Burnley', 'Burnley FC']
	},
	{
		abbr: 'CHE',
		names: ['Chelsea', 'Chelsea FC']
	},
	{
		abbr: 'CRY',
		names: ['Crystal Palace', 'Crystal Palace FC']
	},
	{
		abbr: 'EVE',
		names: ['Everton', 'Everton FC']
	},
	{
		abbr: 'HUD',
		names: ['Huddersfield', 'Huddersfield Town', 'Huddersfield Town FC']
	},
	{
		abbr: 'LEI',
		names: ['Leicester', 'Leicester City', 'Leicester City FC']
	},
	{
		abbr: 'LIV',
		names: ['Liverpool', 'Liverpool FC']
	},
	{
		abbr: 'MAN',
		names: ['Man Utd', 'Man Utd FC', 'Manchester United' ,'Manchester United FC']
	},
	{
		abbr: 'MNC',
		names: ['Man City', 'Man City FC', 'Manchester City' ,'Manchester City FC']
	},
	{
		abbr: 'NEW',
		names: ['Newcastle Utd', 'Newcastle', 'Newcastle United' ,'Newcastle United FC']
	},
	{
		abbr: 'SOU',
		names: ['Southampton', 'Southampton FC']
	},
	{
		abbr: 'STK',
		names: ['Stoke', 'Stoke City', 'Stoke City FC']
	},
	{
		abbr: 'SWA',
		names: ['Swansea', 'Swansea City']
	},
	{
		abbr: 'TOT',
		names: ['Tottenham', 'Tottenham Hotspur']
	},
	{
		abbr: 'WAT',
		names: ['Watford', 'Watford FC']
	},
	{
		abbr: 'WBA',
		names: ['West Bromwich Albion', 'WBA']
	},
	{
		abbr: 'WHU',
		names: ['West Ham', 'West Ham United', 'West Ham Utd']
	},
]

function imageChecker(teamName) {
	console.log(teamName)

	let teamAbbr = teams.filter(function(team) {
		if(team.names.includes(teamName)) {
			return team;
		}
	});

	if(teamAbbr[0] && teamAbbr[0].abbr) {
		return teamAbbr[0].abbr
	} else {
		return '';
	}
}

module.exports = {
	imageChecker
};
