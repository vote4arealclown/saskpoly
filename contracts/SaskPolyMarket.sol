// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SaskPolyMarket {
    address public owner;
    uint256 public marketCount;
    uint256 public platformFeeBps = 250; // 2.5%

    enum MarketStatus { Open, Closed, Resolved, Cancelled }

    struct Market {
        string title;
        string description;
        uint256 yesPool;
        uint256 noPool;
        uint256 totalVolume;
        MarketStatus status;
        bool resolution;
        uint256 closesAt;
        address creator;
        uint256 vigBps;
    }

    struct Bet {
        address user;
        uint256 marketId;
        uint256 amount;
        bool outcome; // true = YES
        uint256 shares;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(address => uint256[]) public userBets;

    event MarketCreated(uint256 indexed marketId, string title, address creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool outcome, uint256 amount, uint256 shares);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createMarket(
        string memory _title,
        string memory _description,
        uint256 _closesAt,
        uint256 _vigBps
    ) external returns (uint256) {
        require(_closesAt > block.timestamp, "Closes in past");
        marketCount++;
        uint256 id = marketCount;
        markets[id] = Market({
            title: _title,
            description: _description,
            yesPool: 0,
            noPool: 0,
            totalVolume: 0,
            status: MarketStatus.Open,
            resolution: false,
            closesAt: _closesAt,
            creator: msg.sender,
            vigBps: _vigBps
        });
        emit MarketCreated(id, _title, msg.sender);
        return id;
    }

    function placeBet(uint256 _marketId, bool _outcome) external payable {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.Open, "Not open");
        require(block.timestamp < market.closesAt, "Closed");
        require(msg.value > 0, "No value");

        uint256 vig = (msg.value * market.vigBps) / 10000;
        uint256 betAmount = msg.value - vig;

        uint256 shares;
        if (_outcome) {
            shares = market.yesPool == 0 ? betAmount : (betAmount * market.noPool) / market.yesPool;
            market.yesPool += betAmount;
        } else {
            shares = market.noPool == 0 ? betAmount : (betAmount * market.yesPool) / market.noPool;
            market.noPool += betAmount;
        }

        market.totalVolume += msg.value;

        Bet memory newBet = Bet({
            user: msg.sender,
            marketId: _marketId,
            amount: msg.value,
            outcome: _outcome,
            shares: shares,
            claimed: false
        });

        marketBets[_marketId].push(newBet);
        userBets[msg.sender].push(marketBets[_marketId].length - 1);

        emit BetPlaced(_marketId, msg.sender, _outcome, msg.value, shares);
    }

    function resolveMarket(uint256 _marketId, bool _outcome) external onlyOwner {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.Open || market.status == MarketStatus.Closed, "Invalid status");
        market.status = MarketStatus.Resolved;
        market.resolution = _outcome;
        emit MarketResolved(_marketId, _outcome);
    }

    function claim(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.Resolved, "Not resolved");

        uint256 totalPayout = 0;
        Bet[] storage bets = marketBets[_marketId];

        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == msg.sender && !bets[i].claimed && bets[i].outcome == market.resolution) {
                uint256 payout = calculatePayout(_marketId, i);
                totalPayout += payout;
                bets[i].claimed = true;
            }
        }

        require(totalPayout > 0, "No payout");
        payable(msg.sender).transfer(totalPayout);
        emit Claimed(_marketId, msg.sender, totalPayout);
    }

    function calculatePayout(uint256 _marketId, uint256 _betIndex) public view returns (uint256) {
        Market memory market = markets[_marketId];
        Bet memory bet = marketBets[_marketId][_betIndex];

        if (bet.outcome != market.resolution) return 0;

        uint256 winningPool = market.resolution ? market.yesPool + market.noPool : market.yesPool + market.noPool;
        uint256 betPool = bet.outcome ? market.yesPool : market.noPool;

        if (betPool == 0) return 0;
        return (bet.shares * winningPool) / betPool;
    }

    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getBets(uint256 _marketId) external view returns (Bet[] memory) {
        return marketBets[_marketId];
    }

    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
