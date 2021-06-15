// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract TONEscrow is Ownable {
    event DealAdded(
        address payee,
        uint256 tonAmount,
        address payToken,
        uint256 payTokenAmount
    );

    event Dealt(
        address payee,
        uint256 tonAmount,
        address payToken,
        uint256 payTokenAmount
    );

    event DealDeled(
        address payee,
        uint256 tonAmount,
        address payToken,
        uint256 payTokenAmount
    );

    struct Deal {
        uint256 tonAmount;
        uint256 payTokenAmount;
        address payToken;
    }

    IERC20 public ton;
    mapping(address => Deal) public deals;

    constructor(address _tonAddress) {
        ton = IERC20(_tonAddress);
    }

    function addDeal(
        address _payee,
        uint256 _tonAmount,
        address _payToken,
        uint256 _payTokenAmount
    )
        external
        onlyOwner
    {
        Deal storage deal = deals[_payee];
        deal.payToken = _payToken;
        deal.payTokenAmount = _payTokenAmount;
        deal.tonAmount = _tonAmount;

        emit DealAdded(_payee, _tonAmount, _payToken, _payTokenAmount);
    }

    function delDeal(
        address _payee
    )
        external
        onlyOwner
    {   
        Deal storage deal = deals[_payee];

        delete deals[_payee];

        emit DealDeled(_payee, deal.tonAmount, deal.payToken, deal.payTokenAmount);
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(
            ton.balanceOf(address(this)) > _amount,
            "don't have ton amount"
        );
        ton.transfer(msg.sender, _amount);
    }

    function buy(
        address _payToken,
        uint256 _payTokenAmount
    )
        external
    {
        require(
            _payToken != address(0),
            "don't call buyer throgh ETH"
        );
        _buy(_payToken, _payTokenAmount);
    }

    receive() external payable {
        _buy(address(0), msg.value);
        payable(owner()).transfer(msg.value);
    }

    function _buy(
        address _payToken,
        uint256 _payTokenAmount
    )
        internal
    {
        Deal storage deal = deals[msg.sender];
        uint256 tonBalance = ton.balanceOf(address(this));
        require(
            deal.payToken == _payToken,
            "wrong token"
        );
        require(
            deal.payTokenAmount == _payTokenAmount,
            "wrong amount"
        );
        require(
            tonBalance >= deal.tonAmount,
            "don't have ton amount"
        );

        if (_payToken != address(0)) {
            IERC20 payToken = IERC20(_payToken);
            uint256 balance1 = payToken.balanceOf(owner());
            uint256 tokenAllowance = payToken.allowance(msg.sender, address(this));
            require(tokenAllowance >= _payTokenAmount, "ERC20: transfer amount exceeds allowance");
            payToken.transferFrom(msg.sender, owner(), _payTokenAmount);
            require(
                payToken.balanceOf(owner()) - balance1 == _payTokenAmount,
                "Failed to transfer payToken"
            );
        }

        ton.transfer(msg.sender, deal.tonAmount);

        delete deals[msg.sender];
        emit Dealt(msg.sender, deal.tonAmount, _payToken, _payTokenAmount);
    }
}
